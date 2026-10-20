"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  business,
  CLIENT_TYPES,
  staffDoesService,
  type ClientType,
  type Service,
  type StaffMember,
} from "@/config/business";
import { Icon } from "@/components/Icon";
import { Portrait } from "@/components/Portrait";
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
  initialStaffId: string | null;
  initialServiceId: string | null;
  initialCategoryId: string | null;
  initialSlot: string | null;
  today: string;
  lastDate: string;
  idempotencyKey: string;
  cancelCutoffHours: number;
}

const ANY = "any";
const WEEK = 7;
const FIELD_LABELS = { customerName: "Name", phone: "Phone number", email: "Email", notes: "Notes" } as const;

export function BookingFlow(props: Props) {
  const { today, lastDate } = props;
  const { categories, services, staff, locale, timezone } = business;
  const fmt = useMemo(() => makeFormatters(locale, timezone), [locale, timezone]);
  const hourOf = useMemo(() => {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" });
    return (iso: string) => Number(f.format(new Date(iso)));
  }, [timezone]);

  const [clientType, setClientType] = useState<ClientType>("child");
  const [staffId, setStaffId] = useState<string | null>(props.initialStaffId);
  const [serviceId, setServiceId] = useState<string | null>(props.initialServiceId);
  // A service picked elsewhere narrows the stylist list until the visitor asks to see everyone.
  const [staffFilterService, setStaffFilterService] = useState<string | null>(
    props.initialStaffId ? null : props.initialServiceId,
  );
  const [categoryFilter, setCategoryFilter] = useState<string | null>(props.initialCategoryId);
  const [weekStart, setWeekStart] = useState(() => {
    if (!props.initialSlot) return today;
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(props.initialSlot));
    return d >= today && d <= lastDate ? d : today;
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ key: string; days?: Day[]; error?: string } | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(props.initialSlot);

  const member = staff.find((s) => s.id === staffId) ?? null;
  const service = services.find((s) => s.id === serviceId) ?? null;
  const category = service ? categories.find((c) => c.id === service.categoryId) : null;

  const visibleStaff = useMemo(() => {
    const filterService = services.find((s) => s.id === staffFilterService);
    return filterService ? staff.filter((m) => staffDoesService(m, filterService)) : staff;
  }, [staff, services, staffFilterService]);

  const availableServices = useMemo(
    () => (member ? services.filter((s) => staffDoesService(member, s)) : services),
    [member, services],
  );

  const requestKey = service && staffId ? `${service.id}|${staffId}|${weekStart}|${reloadKey}` : null;
  const days = result && result.key === requestKey ? (result.days ?? null) : null;
  const loadError = result && result.key === requestKey ? (result.error ?? null) : null;

  const [state, formAction, pending] = useActionState<BookingFormState, FormData>(async (prev, formData) => {
    const next = await submitBooking(prev, formData);
    if (next.slotTaken) {
      setSlot(null);
      setReloadKey((k) => k + 1);
    }
    return next;
  }, {});

  const detailsRef = useRef<HTMLHeadingElement>(null);
  const serviceRef = useRef<HTMLHeadingElement>(null);
  const timeRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingInitialSlot = useRef(props.initialSlot);

  // Keep the choices in the URL so refresh and shared links land on the same step.
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const [k, v] of [
      ["staff", staffId],
      ["service", serviceId],
    ] as const) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    url.searchParams.delete("slot");
    url.searchParams.delete("category");
    window.history.replaceState(null, "", url);
  }, [staffId, serviceId]);

  useEffect(() => {
    if (!service || !staffId || !requestKey) return;
    const controller = new AbortController();
    const qs = new URLSearchParams({ service: service.id, staff: staffId, from: weekStart, days: String(WEEK) });
    fetch(`/api/availability?${qs}`, { signal: controller.signal, cache: "no-store" })
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
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setResult({ key: requestKey, error: err.message });
      });
    return () => controller.abort();
  }, [service, staffId, weekStart, requestKey]);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state.fieldErrors]);

  const activeDay = days?.find((d) => d.date === date) ?? null;
  const chosenSlot = slot && activeDay?.slots.includes(slot) ? slot : null;

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  }

  function chooseStaff(id: string) {
    setStaffId(id);
    setSlot(null);
    const m = staff.find((s) => s.id === id);
    if (m && service && !staffDoesService(m, service)) setServiceId(null);
    if (!service || (m && !staffDoesService(m, service))) scrollTo(serviceRef);
    else scrollTo(timeRef);
  }

  function chooseService(id: string) {
    setServiceId(id);
    setSlot(null);
    scrollTo(timeRef);
  }

  function chooseSlot(iso: string) {
    setSlot(iso);
    scrollTo(detailsRef);
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

  const servicesByCategory = categories
    .filter((c) => !categoryFilter || c.id === categoryFilter)
    .map((c) => ({ category: c, items: availableServices.filter((s) => s.categoryId === c.id) }))
    .filter((g) => g.items.length);

  const canGoBack = weekStart > today;
  const canGoForward = addDays(weekStart, WEEK) <= lastDate;
  const openDays = days?.filter((d) => d.status === "open").length ?? 0;
  const err = state.fieldErrors ?? {};
  const filterService = services.find((s) => s.id === staffFilterService);
  const ready = !!(service && staffId && chosenSlot);

  return (
    <div className={`wrap ${styles.layout}`}>
      <div className={styles.main}>
        <header className={styles.top}>
          <h1 className={styles.title}>Book an appointment</h1>
          <p className="muted">Choose your stylist and a time. You pay at the salon, nothing is charged online.</p>
        </header>

        {/* 1. Who for */}
        <section aria-labelledby="step-who" className={`glass ${styles.step}`}>
          <h2 id="step-who" className={styles.stepTitle}>
            <span className={styles.stepNum} aria-hidden="true">1</span> Who is the appointment for?
          </h2>
          <fieldset className={styles.segmented}>
            <legend className="sr-only">Who is the appointment for?</legend>
            {CLIENT_TYPES.map((t) => (
              <label key={t.id} className={styles.segment}>
                <input type="radio" name="client-type" value={t.id} checked={clientType === t.id} onChange={() => setClientType(t.id)} />
                <Icon name={t.id === "child" ? "child" : "user"} size={22} />
                {t.label}
              </label>
            ))}
          </fieldset>
        </section>

        {/* 2. Stylist */}
        <section aria-labelledby="step-staff" className={`glass ${styles.step}`}>
          <h2 id="step-staff" className={styles.stepTitle}>
            <span className={styles.stepNum} aria-hidden="true">2</span> Choose your stylist
          </h2>
          {filterService && (
            <p className={styles.filterNote}>
              Showing who does <strong>{filterService.name}</strong>.{" "}
              <button type="button" className={styles.linkButton} onClick={() => setStaffFilterService(null)}>
                Show everyone
              </button>
            </p>
          )}
          <fieldset className={styles.staffGrid}>
            <legend className="sr-only">Choose your stylist</legend>
            <label className={`${styles.staffOption} ${styles.anyOption}`}>
              <input type="radio" name="staff-choice" value={ANY} checked={staffId === ANY} onChange={() => chooseStaff(ANY)} />
              <span className={styles.anyArt} aria-hidden="true">
                <Icon name="people" size={34} />
              </span>
              <span className={styles.staffName}>Anyone available</span>
              <span className={styles.staffRole}>Most open times</span>
            </label>
            {visibleStaff.map((m: StaffMember) => (
              <label key={m.id} className={styles.staffOption}>
                <input type="radio" name="staff-choice" value={m.id} checked={staffId === m.id} onChange={() => chooseStaff(m.id)} />
                <Portrait staff={m} sizes="8rem" />
                <span className={styles.staffName}>{m.name}</span>
                <span className={styles.staffRole}>{m.role}</span>
              </label>
            ))}
          </fieldset>
        </section>

        {/* 3. Service */}
        <section aria-labelledby="step-service" className={`glass ${styles.step}`} data-disabled={!staffId || undefined}>
          <h2 id="step-service" ref={serviceRef} tabIndex={-1} className={styles.stepTitle}>
            <span className={styles.stepNum} aria-hidden="true">3</span> Service
          </h2>
          {!staffId ? (
            <p className="muted">Choose a stylist first, or pick &quot;Anyone available&quot;.</p>
          ) : (
            <>
              <div className={styles.catFilter} role="group" aria-label="Filter services">
                <button type="button" aria-pressed={!categoryFilter} onClick={() => setCategoryFilter(null)}>
                  All
                </button>
                {categories
                  .filter((c) => availableServices.some((s) => s.categoryId === c.id))
                  .map((c) => (
                    <button key={c.id} type="button" aria-pressed={categoryFilter === c.id} onClick={() => setCategoryFilter(c.id)}>
                      <Icon name={c.icon} size={16} /> {c.name}
                    </button>
                  ))}
              </div>
              {servicesByCategory.length === 0 ? (
                <p className="muted">
                  {member?.name} doesn&apos;t do this kind of service.{" "}
                  <button type="button" className={styles.linkButton} onClick={() => setCategoryFilter(null)}>
                    See what they do
                  </button>
                </p>
              ) : (
                <fieldset className={styles.serviceGroups}>
                  <legend className="sr-only">Choose a service</legend>
                  {servicesByCategory.map(({ category: c, items }) => (
                    <div key={c.id} className={styles.serviceGroup}>
                      <p className={styles.groupLabel}>
                        <Icon name={c.icon} size={18} /> {c.name}
                        {c.fromZar !== null && <span className={styles.groupPrice}>from {formatZar(c.fromZar)}</span>}
                      </p>
                      <div className={styles.serviceList}>
                        {items.map((s: Service) => (
                          <label key={s.id} className={styles.serviceOption}>
                            <input type="radio" name="service-choice" value={s.id} checked={serviceId === s.id} onChange={() => chooseService(s.id)} />
                            <span className={styles.serviceName}>{s.name}</span>
                            <span className={styles.serviceMeta}>
                              About {formatDuration(s.durationMinutes)}
                              {s.priceZar !== null && `, ${formatZar(s.priceZar)}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </fieldset>
              )}
            </>
          )}
        </section>

        {/* 4. Day and time */}
        <section aria-labelledby="step-time" className={`glass ${styles.step}`} data-disabled={!service || !staffId || undefined}>
          <h2 id="step-time" ref={timeRef} tabIndex={-1} className={styles.stepTitle}>
            <span className={styles.stepNum} aria-hidden="true">4</span> Day and time
          </h2>

          {!service || !staffId ? (
            <p className="muted">Choose a stylist and a service to see open times.</p>
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
                        No open times on these days{member ? ` for ${member.name}` : ""}.{" "}
                        {canGoForward ? "Try later days" : "Online booking is full for now"}
                        {staffId !== ANY ? (
                          <>
                            {" or "}
                            <button type="button" className={styles.linkButton} onClick={() => chooseStaff(ANY)}>
                              book with anyone available
                            </button>
                          </>
                        ) : null}
                        .
                      </p>
                    ) : activeDay ? (
                      // Keyed by day so switching days replays the short entrance
                      <div key={activeDay.date} className={`enter ${styles.times}`}>
                        <p className="sr-only">Times for {fmt.calLong(activeDay.date)}</p>
                        {groups.map((g) => (
                          <fieldset key={g.label} className={styles.timeGroup}>
                            <legend className={styles.timeGroupLabel}>{g.label}</legend>
                            <div className={styles.timeGrid}>
                              {g.slots.map((s) => (
                                <button key={s} type="button" className={styles.time} aria-pressed={chosenSlot === s} onClick={() => chooseSlot(s)}>
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

        {/* 5. Details */}
        <section aria-labelledby="step-details" className={`glass ${styles.step}`} data-disabled={!ready || undefined}>
          <h2 id="step-details" ref={detailsRef} tabIndex={-1} className={styles.stepTitle}>
            <span className={styles.stepNum} aria-hidden="true">5</span> Your details
          </h2>

          {state.formError && (
            <div className="notice notice-error" role="alert">
              <strong>{state.formError}</strong>
            </div>
          )}
          {Object.keys(err).length > 0 && (
            <div className="notice notice-error" role="alert">
              <strong>{Object.keys(err).length === 1 ? "One detail needs fixing:" : `${Object.keys(err).length} details need fixing:`}</strong>
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
            <input type="hidden" name="staffId" value={staffId ?? ""} />
            <input type="hidden" name="clientType" value={clientType} />
            <input type="hidden" name="startsAt" value={chosenSlot ?? ""} />
            <input type="hidden" name="idempotencyKey" value={props.idempotencyKey} />

            <div className={styles.twoCol}>
              <div className="field">
                <label htmlFor="customerName">{clientType === "child" ? "Parent or guardian's name" : "Your name"}</label>
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
                <span id="phone-hint" className="hint">In case we need to reach you about the appointment.</span>
                {err.phone && <p id="phone-error" className="field-error">{err.phone}</p>}
              </div>
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
                Notes <span className="muted">(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                className="input"
                maxLength={500}
                placeholder={clientType === "child" ? "Child's name and age, hair length, the style you'd like…" : "Hair length, preferred style, anything we should know…"}
                defaultValue={state.values?.notes}
                aria-invalid={!!err.notes || undefined}
                aria-describedby={err.notes ? "notes-error" : undefined}
              />
              {err.notes && <p id="notes-error" className="field-error">{err.notes}</p>}
            </div>

            <p className={`muted ${styles.small}`}>
              We only use these details to manage your booking. See our <a href="/privacy">privacy notice</a>.
            </p>

            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={!ready || pending}>
              {pending ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Booking…
                </>
              )
                : ready
                  ? `Book ${fmt.dayShort(new Date(chosenSlot!))} ${fmt.dayNum(new Date(chosenSlot!))} ${fmt.month(new Date(chosenSlot!))} at ${fmt.time(new Date(chosenSlot!))}`
                  : "Choose a time to continue"}
            </button>
          </form>
        </section>
      </div>

      <aside className={`glass ${styles.summary}`} aria-label="Your booking so far">
        <h2 className={styles.summaryTitle}>Your booking</h2>
        {member ? (
          <div className={styles.summaryStaff}>
            <Portrait staff={member} sizes="4rem" className={styles.summaryFace} />
            <span>
              <strong>{member.name}</strong>
              <span className="muted">{member.role}</span>
            </span>
          </div>
        ) : staffId === ANY ? (
          <div className={styles.summaryStaff}>
            <span className={styles.summaryAny} aria-hidden="true">
              <Icon name="people" size={26} />
            </span>
            <span>
              <strong>Anyone available</strong>
              <span className="muted">We&apos;ll match you with a free stylist</span>
            </span>
          </div>
        ) : null}
        <dl className={styles.summaryList}>
          <div>
            <dt>For</dt>
            <dd>{clientType === "child" ? "A child" : "An adult"}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>{service ? service.name : <span className="muted">Not chosen yet</span>}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>
              {chosenSlot && service ? (
                <>
                  {fmt.dateLong(new Date(chosenSlot))}
                  <br />
                  {fmt.time(new Date(chosenSlot))} to {fmt.time(new Date(new Date(chosenSlot).getTime() + service.durationMinutes * 60000))}
                </>
              ) : (
                <span className="muted">Not chosen yet</span>
              )}
            </dd>
          </div>
          {category?.fromZar != null && (
            <div>
              <dt>Price</dt>
              <dd>
                {service?.priceZar != null ? formatZar(service.priceZar) : `From ${formatZar(category.fromZar)}`}, paid at the salon
              </dd>
            </div>
          )}
        </dl>
        <p className={`muted ${styles.small}`}>You can cancel online up to {props.cancelCutoffHours} hours before.</p>
      </aside>
    </div>
  );
}

function placeholderDays(from: string, lastDate: string): Day[] {
  return Array.from({ length: WEEK }, (_, i) => addDays(from, i))
    .filter((d) => d <= lastDate)
    .map((date) => ({ date, status: "closed" as const, slots: [] }));
}
