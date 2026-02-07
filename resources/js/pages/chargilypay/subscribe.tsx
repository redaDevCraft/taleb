import { Head, useForm } from '@inertiajs/react';
import { redirect as redirectRoute } from '@/routes/chargilypay';
import type { FormEvent } from 'react';

type Props = {
    amount?: number;
    currency?: string;
};

export default function ChargilySubscribe({
    amount = 25000,
    currency = 'dzd',
}: Props) {
    const form = useForm({
        amount,
        currency,
        locale: 'ar',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(redirectRoute().url);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
            <Head title="ChargilyPay Subscription" />
            <div className="absolute inset-0 opacity-70" aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,90,31,0.12),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_60%_70%,rgba(16,185,129,0.12),transparent_35%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
            </div>
            <main className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="space-y-2">
                        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-orange-200/90 uppercase ring-1 ring-white/10">
                            Live Sandbox
                        </p>
                        <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                            ChargilyPay public subscription test
                        </h1>
                        <p className="max-w-2xl text-sm text-slate-200/80 sm:text-base">
                            Trigger a checkout using the ChargilyPay SDK. This
                            page is public, uses test credentials, and posts to
                            the webhook endpoint configured in this project.
                        </p>
                    </div>
                    <div className="text-xs text-slate-300/80">
                        <p>
                            Webhook:{' '}
                            <code className="rounded bg-white/10 px-2 py-1">
                                /chargilypay/webhook
                            </code>
                        </p>
                        <p className="text-orange-200/80">
                            Make sure your environment is reachable from the
                            internet.
                        </p>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-orange-500/10 backdrop-blur">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm tracking-[0.2em] text-orange-200/90 uppercase">
                                    Trial plan
                                </p>
                                <h2 className="mt-2 text-3xl font-semibold text-white">
                                    DZD{' '}
                                    {form.data.amount.toLocaleString('en-DZ')}
                                </h2>
                                <p className="mt-2 text-sm text-slate-200/80">
                                    A lightweight one-time payment to validate
                                    the ChargilyPay flow.
                                </p>
                            </div>
                            <div className="rounded-full bg-emerald-400/15 px-4 py-2 text-xs font-semibold text-emerald-200 uppercase ring-1 ring-emerald-300/30">
                                Test mode
                            </div>
                        </div>
                        <ul className="mt-6 space-y-2 text-sm text-slate-200/90">
                            <li className="flex items-start gap-2">
                                <span className="mt-1 inline-block size-2 rounded-full bg-emerald-400" />
                                Redirects to Chargily checkout with your
                                configured webhook.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 inline-block size-2 rounded-full bg-emerald-400" />
                                Amount and currency are editable for quick
                                testing.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 inline-block size-2 rounded-full bg-emerald-400" />
                                Uses a public test user if no one is signed in.
                            </li>
                        </ul>
                    </section>

                    <form
                        onSubmit={submit}
                        className="relative rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-blue-500/10 backdrop-blur"
                    >
                        <div className="absolute inset-x-10 top-0 -translate-y-1/2 rounded-full bg-blue-500/10 px-4 py-2 text-center text-xs font-semibold tracking-[0.2em] text-blue-100 uppercase ring-1 ring-blue-300/30">
                            Checkout simulator
                        </div>

                        <div className="mt-6 space-y-5">
                            <label className="flex flex-col gap-2 text-sm text-slate-200/90">
                                Amount (in cents)
                                <input
                                    type="number"
                                    min={100}
                                    step={100}
                                    value={form.data.amount}
                                    onChange={(event) =>
                                        form.setData(
                                            'amount',
                                            Number(event.target.value) || 0,
                                        )
                                    }
                                    className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 text-base text-white shadow-inner shadow-black/20 focus:border-blue-300/50 focus:ring-2 focus:ring-blue-400/40 focus:outline-none"
                                    required
                                />
                                {form.errors.amount && (
                                    <span className="text-xs font-semibold text-orange-200">
                                        {form.errors.amount}
                                    </span>
                                )}
                            </label>

                            <label className="flex flex-col gap-2 text-sm text-slate-200/90">
                                Currency
                                <select
                                    value={form.data.currency}
                                    onChange={(event) =>
                                        form.setData(
                                            'currency',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 text-base text-white shadow-inner shadow-black/20 focus:border-blue-300/50 focus:ring-2 focus:ring-blue-400/40 focus:outline-none"
                                >
                                    <option value="dzd">DZD</option>
                                    <option value="eur">EUR</option>
                                </select>
                                {form.errors.currency && (
                                    <span className="text-xs font-semibold text-orange-200">
                                        {form.errors.currency}
                                    </span>
                                )}
                            </label>

                            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200/80">
                                <div>
                                    <p className="font-semibold text-white">
                                        Webhook reminder
                                    </p>
                                    <p className="text-[11px] text-slate-300/90">
                                        Local environments need an online tunnel
                                        (e.g. ngrok) for Chargily callbacks.
                                    </p>
                                </div>
                                <span className="rounded-full bg-orange-400/15 px-3 py-1 text-[11px] font-semibold text-orange-100 uppercase ring-1 ring-orange-200/30">
                                    Heads up
                                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-orange-500 px-4 py-3 text-sm font-semibold tracking-wide text-white uppercase shadow-lg shadow-orange-500/20 transition hover:shadow-orange-500/30 focus:ring-2 focus:ring-white/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {form.processing
                                ? 'Redirecting…'
                                : 'Start Chargily checkout'}
                        </button>
                        {form.errors.payment && (
                            <p className="mt-3 text-center text-sm font-semibold text-orange-200">
                                {form.errors.payment}
                            </p>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
}
