"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Service } from "@/config/business";
import { formatZar } from "@/lib/money";
import { addDays, formatDuration, makeFormatters } from "@/lib/time";
import { submitBooking, type BookingFormState } from "./actions";
import styles from "./book.module.css";

type DayStatus = "open" | "full" | "closed";
interface Day {
  date: string;
  status: DayStatus;
  slots: string[];
}

interface Props {
  services: Service[];
  initialServiceId: string | null;
  /** ISO start time picked on another page (e.g. the homepage). */
  initialSlot: string | null;
  today: string;
  lastDate: string;
  idempotencyKey: string;
  locale: string;
  timezone: string;
  cancelCutoffHours: number;
}

const WEEK = 7;
const FIELD_LABELS = { customerName: "Name", phone: "Phone number", email: "Email", notes: "Notes" } as const;

export function BookingFlow(props: Props) {
  const { services, today, lastDate, locale, timezone } = props;
  const fmt = useMemo(() => makeFormatters(locale, timezone), [locale, timezone]);
  const hourOf = useMemo(() => {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" });
    return (iso: string) => Number(f.format(new Date(iso)));
  }, [timezone]);

  const [serviceId, setServiceId] = useState<string | null>(props.initialServiceId ?? (services.length === 1 ? services[0]!.id : null));
  const [weekStart, setWeekStart] = useState(() => {
    if (!props.initialSlot) return today;
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(props.initialSlot));
    return d >= today && d <= lastDate ? d : today;
  });
  const [reloadKey, setReloadKey] = useState(0);
  // Results are tagged with the request they answer, so a stale result never shows.
  const [result, setResult] = useState<{ key: string; days?: Day[]; error?: string } | null>(null);
  const requestKey = serviceId ? `${serviceId}|${weekStart}|${reloadKey}` : null;
  const days = result && result.key === requestKey ? (result.days ?? null) : null;
  const loadError = result && result.key === requestKey ? (result.error ?? null) : null;
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(props.initialSlot);
  const pendingInitialSlot = useRef(props.initialSlot);

  const [state, formAction, pending] = useActionState<BookingFormState, FormData>(async (prev, formData) => {
    const next = await submitBooking(prev, formData);
    if (next.slotTaken) {
      setSlot(null);
      setReloadKey((k) => k + 1);
    }
    return next;
  }, {});

  const service = services.find((s) => s.id === serviceId) ?? null;
  const detailsRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Keep ?service= in the URL so refresh and shared links land on the same choice.
  useEffect(() => {
    if (!serviceId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("service", serviceId);
    window.history.replaceState(null, "", url);
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId || !requestKey) return;
    const controller = new AbortController();
    fetch(`/api/availability?service=${encodeURIComponent(serviceId)}&from=${weekStart}&days=${WEEK}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Times couldn't be loaded.");
        return json.days as Day[];
      })
      .then((loaded) => {
        setResult({ key: requestKey, days: loaded });
        const wanted = pendingInitialSlot.current;
        pendingInitialSlot.current = null;
        const wantedDay = wanted ? loaded.find((d) => d.slots.includes(wanted)) : undefined;
        setDate((current) => {
          if (wantedDay) return wantedDay.date;
          if (current && loaded.some((d) => d.date === current && d.status === "open")) return current;
          return loaded.find((d) => d.status === "open")?.date ?? null;
        });
        if (wantedDay) {
          requestAnimationFrame(() => detailsRef.current?.focus({ preventScroll: false }));
        }
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setResult({ key: requestKey, error: err.message });
      });
    return () => controller.abort();
  }, [serviceId, weekStart, requestKey]);

  // Drop a chosen time that's no longer offered after a reload.
  const activeDay = days?.find((d) => d.date === date) ?? null;
  const slotStillValid = !!slot && !!activeDay?.slots.includes(slot);
  const chosenSlot = slotStillValid ? slot : null;

  useEffect(() => {
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
  }, [state.fieldErrors]);

  function chooseService(id: string) {
    setServiceId(id);
    setSlot(null);
  }

  function chooseSlot(iso: string) {
    setSlot(iso);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  }

  const groups = useMemo(() => {
    if (!activeDay) return [];
    const parts: { label: string; slots: string[] }[] = [
      { label: "Morning", slots: [] },
      { label: "Afternoon", slots: [] },
      { label: "Evening", slots: [] },
    ];
    for (const s of activeDay.slots) {
      const h = hourOf(s);
      parts[h < 12 ? 0 : h < 17 ? 1 : 2]!.slots.push(s);
    }
    return parts.filter((p) => p.slots.length);
  }, [activeDay, hourOf]);

  const canGoBack = weekStart > today;
  const canGoForward = addDays(weekStart, WEEK) <= lastDate;
  const openDays = days?.filter((d) => d.status === "open").length ?? 0;
  const err = state.fieldErrors ?? {};

  return (
    <div className={`wrap ${styles.layout}`}>
      <div className={styles.main}>
        <h1 className={styles.title}>Book an appointment</h1>
        <p className="muted">Choose a service and a time. You pay in person, nothing is charged online.</p>

        <section aria-labelledby="step-service" className={styles.step}>
          <h2 id="step-service" className={styles.stepTitle}>
            <span className={styles.stepNum} aria-hidden="true">1</span> Service
          </h2>
          <fieldset className={styles.services}>
            <legend className="sr-only">Choose a service</legend>
            {services.map((s) => (
              <label key={s.id} className={styles.serviceOption}>
                <input
                  type="radio"
                  name="service-choice"
                  value={s.id}
                  checked={serviceId === s.id}
                  onChange={() => chooseService(s.id)}
                />
                <span className={styles.serviceText}>
                  <span className={styles.serviceName}>{s.name}</span>
                  <span className="muted">
                    {formatDuration(s.durationMinutes)}
                    {s.priceZar !== null && `, ${formatZar(s.priceZar, locale)}`}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        <section aria-labelledby="step-time" className={styles.step} data-disabled={!service || undefined}>
          <h2 id="step-time" className={styles.stepTitle}>
            <span className={styles.stepNum} aria-hidden="true">2</span> Day and time
          </h2>

          {!service ? (
            <p className="muted">Choose a service first to see open times.</p>
          ) : (
            <>
              <div className={styles.weekNav}>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setWeekStart((w) => (addDays(w, -WEEK) < today ? today : addDays(w, -WEEK)))}
                  disabled={!canGoBack}
                >
                  Earlier days
                </button>
                <p className={styles.weekLabel} aria-live="polite">
                  {fmt.calLong(weekStart)} to {fmt.calLong(addDays(weekStart, WEEK - 1))}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setWeekStart((w) => addDays(w, WEEK))}
                  disabled={!canGoForward}
                >
                  Later days
                </button>
              </div>

              {loadError ? (
                <div className="notice notice-error" role="alert">
                  <strong>{loadError}</strong>
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => setReloadKey((k) => k + 1)}>
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.days} role="group" aria-label="Day" aria-busy={!days}>
                    {(days ?? placeholderDays(weekStart, lastDate)).map((d) => {
                      const loading = !days;
                      const selectable = !loading && d.status === "open";
                      return (
                        <button
                          key={d.date}
                          type="button"
                          aria-pressed={date === d.date}
                          disabled={!selectable}
                          className={styles.day}
                          onClick={() => {
                            setDate(d.date);
                            setSlot(null);
                          }}
                        >
                          <span className={styles.dayName}>{d.date === today ? "Today" : fmt.calShortDay(d.date)}</span>
                          <span className={styles.dayNum}>{fmt.calDayNum(d.date)}</span>
                          <span className={styles.dayMonth}>{fmt.calMonth(d.date)}</span>
                          <span className={styles.dayStatus}>
                            {loading ? " " : d.status === "open" ? `${d.slots.length} open` : d.status === "full" ? "Full" : "Closed"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div aria-live="polite">
                    {!days ? (
                      <p className="muted">Loading open times…</p>
                    ) : openDays === 0 ? (
                      <p className="muted">
                        No open times on these days.{" "}
                        {canGoForward ? "Try later days." : "Online booking is full for now."}
                      </p>
                    ) : activeDay ? (
                      <div className={styles.times}>
                        <p className="sr-only">Times for {fmt.calLong(activeDay.date)}</p>
                        {groups.map((g) => (
                          <fieldset key={g.label} className={styles.timeGroup}>
                            <legend className={styles.timeGroupLabel}>{g.label}</legend>
                            <div className={styles.timeGrid}>
                              {g.slots.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className={styles.time}
                                  aria-pressed={chosenSlot === s}
                                  onClick={() => chooseSlot(s)}
                                >
                                  {fmt.time(new Date(s))}
                                </button>
                              ))}
                            </div>
                          </fieldset>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="step-details" className={styles.step} data-disabled={!chosenSlot || undefined}>
          <h2 id="step-details" ref={detailsRef} tabIndex={-1} className={styles.stepTitle}>
            <span className={styles.stepNum} aria-hidden="true">3</span> Your details
          </h2>

          {state.formError && (
            <div className="notice notice-error" role="alert">
              <strong>{state.formError}</strong>
            </div>
          )}
          {Object.keys(err).length > 0 && (
            <div className="notice notice-error" role="alert">
              <strong>
                {Object.keys(err).length === 1 ? "One detail needs fixing:" : `${Object.keys(err).length} details need fixing:`}
              </strong>
              <ul className={styles.errorList}>
                {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[])
                  .filter((k) => err[k])
                  .map((k) => (
                    <li key={k}>
                      <a href={`#${k}`}>{FIELD_LABELS[k]}</a>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <form ref={formRef} action={formAction} className={styles.form} noValidate>
            <input type="hidden" name="serviceId" value={serviceId ?? ""} />
            <input type="hidden" name="startsAt" value={chosenSlot ?? ""} />
            <input type="hidden" name="idempotencyKey" value={props.idempotencyKey} />

            <div className="field">
              <label htmlFor="customerName">Name</label>
              <input
                id="customerName"
                name="customerName"
                className="input"
                autoComplete="name"
                required
                maxLength={80}
                defaultValue={state.values?.customerName}
                aria-invalid={!!err.customerName || undefined}
                aria-describedby={err.customerName ? "customerName-error" : undefined}
              />
              {err.customerName && <p id="customerName-error" className="field-error">{err.customerName}</p>}
            </div>

            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <span id="phone-hint" className="hint">In case we need to reach you about your appointment.</span>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="input"
                autoComplete="tel"
                inputMode="tel"
                required
                defaultValue={state.values?.phone}
                aria-invalid={!!err.phone || undefined}
                aria-describedby={err.phone ? "phone-hint phone-error" : "phone-hint"}
              />
              {err.phone && <p id="phone-error" className="field-error">{err.phone}</p>}
            </div>

            <div className="field">
              <label htmlFor="email">
                Email <span className="muted">(optional)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                autoComplete="email"
                defaultValue={state.values?.email}
                aria-invalid={!!err.email || undefined}
                aria-describedby={err.email ? "email-error" : undefined}
              />
              {err.email && <p id="email-error" className="field-error">{err.email}</p>}
            </div>

            <div className="field">
              <label htmlFor="notes">
                Anything we should know? <span className="muted">(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                className="input"
                maxLength={500}
                defaultValue={state.values?.notes}
                aria-invalid={!!err.notes || undefined}
                aria-describedby={err.notes ? "notes-error" : undefined}
              />
              {err.notes && <p id="notes-error" className="field-error">{err.notes}</p>}
            </div>

            <p className={`muted ${styles.small}`}>
              We only use these details to manage your booking. See our <a href="/privacy">privacy notice</a>.
            </p>

            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={!chosenSlot || pending}>
              {pending
                ? "Booking…"
                : chosenSlot
                  ? `Book ${fmt.dayShort(new Date(chosenSlot))} ${fmt.dayNum(new Date(chosenSlot))} ${fmt.month(new Date(chosenSlot))} at ${fmt.time(new Date(chosenSlot))}`
                  : "Pick a time to continue"}
            </button>
          </form>
        </section>
      </div>

      <aside className={styles.summary} aria-label="Your booking so far">
        <h2 className={styles.summaryTitle}>Your booking</h2>
        <dl className={styles.summaryList}>
          <div>
            <dt>Service</dt>
            <dd>{service ? service.name : <span className="muted">Not chosen yet</span>}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>
              {chosenSlot ? (
                <>
                  {fmt.dateLong(new Date(chosenSlot))}
                  <br />
                  {fmt.time(new Date(chosenSlot))}
                  {service && ` to ${fmt.time(new Date(new Date(chosenSlot).getTime() + service.durationMinutes * 60000))}`}
                </>
              ) : (
                <span className="muted">Not chosen yet</span>
              )}
            </dd>
          </div>
          {service?.priceZar != null && (
            <div>
              <dt>Price</dt>
              <dd>{formatZar(service.priceZar, locale)}, paid in person</dd>
            </div>
          )}
        </dl>
        <p className={`muted ${styles.small}`}>
          You can cancel online up to {props.cancelCutoffHours} hours before your appointment.
        </p>
      </aside>
    </div>
  );
}

function placeholderDays(from: string, lastDate: string): Day[] {
  return Array.from({ length: WEEK }, (_, i) => addDays(from, i))
    .filter((d) => d <= lastDate)
    .map((date) => ({ date, status: "closed" as const, slots: [] }));
}
