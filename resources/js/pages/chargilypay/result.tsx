import { Head, Link } from '@inertiajs/react';
import type React from 'react';
import { subscribe as subscribeRoute } from '@/routes/chargilypay';

type CheckoutPayload = Record<string, unknown> | null;
type PaymentPayload = Record<string, unknown> | null;

type Props = {
    checkout: CheckoutPayload;
    payment: PaymentPayload;
};

const statusTone: Record<string, string> = {
    paid: 'text-emerald-200 bg-emerald-500/15 ring-emerald-300/30',
    pending: 'text-amber-200 bg-amber-500/15 ring-amber-300/30',
    failed: 'text-rose-200 bg-rose-500/15 ring-rose-300/30',
    canceled: 'text-rose-200 bg-rose-500/15 ring-rose-300/30',
};

const StatusBadge = ({ status }: { status?: string }) => (
    <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase ring-1 ${
            (status && statusTone[status]) ||
            'bg-white/5 text-slate-200 ring-white/10'
        }`}
    >
        <span className="inline-block size-2 rounded-full bg-current" />
        {status ?? 'unknown'}
    </span>
);

const InfoBlock = ({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) => (
    <section className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-900/40">
        <h3 className="text-sm font-semibold tracking-[0.16em] text-slate-200 uppercase">
            {title}
        </h3>
        {children}
    </section>
);

export default function ChargilyResult({ checkout, payment }: Props) {
    const checkoutStatus =
        (checkout?.status as string | undefined) ?? 'pending';

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
            <Head title="ChargilyPay Result" />
            <div className="absolute inset-0 opacity-70" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.2),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.14),transparent_35%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]" />
            </div>

            <main className="relative mx-auto max-w-4xl px-6 py-14">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs tracking-[0.22em] text-slate-300/80 uppercase">
                            ChargilyPay checkout state
                        </p>
                        <h1 className="text-3xl font-semibold text-white">
                            Webhook + return status
                        </h1>
                        <p className="text-sm text-slate-300/80">
                            Data shown here is what was returned when Chargily
                            redirected back to this app.
                        </p>
                    </div>
                    <StatusBadge status={checkoutStatus} />
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-2">
                    <InfoBlock title="Checkout payload">
                        {checkout ? (
                            <div className="space-y-2 text-sm text-slate-200/90">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-300">
                                        Checkout ID
                                    </span>
                                    <span className="font-semibold text-white">
                                        {(checkout.id as string) || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-300">
                                        Status
                                    </span>
                                    <StatusBadge status={checkoutStatus} />
                                </div>
                                {checkout.amount && (
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-300">
                                            Amount
                                        </span>
                                        <span className="font-semibold text-white">
                                            {checkout.amount as string}
                                        </span>
                                    </div>
                                )}
                                {checkout.currency && (
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-300">
                                            Currency
                                        </span>
                                        <span className="font-semibold text-white uppercase">
                                            {checkout.currency as string}
                                        </span>
                                    </div>
                                )}
                                {checkout.metadata && (
                                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200/80">
                                        <p className="mb-1 font-semibold text-slate-100">
                                            Metadata
                                        </p>
                                        <pre className="text-[11px] break-words whitespace-pre-wrap text-slate-300/90">
                                            {JSON.stringify(
                                                checkout.metadata,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-300/80">
                                No checkout was found for this request. If you
                                are testing locally, verify the `checkout_id`
                                query parameter and that the redirect URL
                                matches this application.
                            </p>
                        )}
                    </InfoBlock>

                    <InfoBlock title="Stored payment (database)">
                        {payment ? (
                            <div className="space-y-2 text-sm text-slate-200/90">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-300">
                                        Payment ID
                                    </span>
                                    <span className="font-semibold text-white">
                                        {payment.id as number}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-300">
                                        Status
                                    </span>
                                    <StatusBadge
                                        status={
                                            (payment.status as string) ??
                                            undefined
                                        }
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-300">
                                        Amount
                                    </span>
                                    <span className="font-semibold text-white">
                                        {payment.amount as string}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-slate-300">
                                        Currency
                                    </span>
                                    <span className="font-semibold text-white uppercase">
                                        {(payment.currency as string) ?? ''}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-xs text-slate-300/80">
                                    <span>Updated</span>
                                    <span>
                                        {(payment.updated_at as string) ??
                                            'N/A'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-300/80">
                                No payment record was attached to this checkout.
                                The webhook may not have reached your
                                environment yet.
                            </p>
                        )}
                    </InfoBlock>
                </div>

                <div className="mt-10 flex flex-wrap gap-3">
                    <Link
                        href={subscribeRoute().url}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold tracking-wide text-white uppercase ring-1 ring-white/20 transition hover:bg-white/15"
                    >
                        Start another checkout
                    </Link>
                    <Link
                        href="https://docs.chargily.com"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-3 text-sm font-semibold tracking-wide text-slate-100/90 uppercase transition hover:border-white/20"
                        target="_blank"
                        rel="noreferrer"
                    >
                        View Chargily docs
                    </Link>
                </div>
            </main>
        </div>
    );
}
