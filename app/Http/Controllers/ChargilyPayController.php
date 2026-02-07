<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\ChargilyPayment;
use App\Models\User;
use Chargily\ChargilyPay\ChargilyPay;
use Chargily\ChargilyPay\Auth\Credentials;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ChargilyPayController extends Controller
{
    /**
     * Simple public page to kick off a test checkout.
     */
    public function subscribePage()
    {
        return Inertia::render('chargilypay/subscribe', [
            'amount' => 25000,
            'currency' => 'dzd',
        ]);
    }
    /**
     * The client will be redirected to the ChargilyPay payment page
     *
     */
    public function redirect(Request $request)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'currency' => ['required', 'string'],
            'locale' => ['nullable', 'string'],
        ]);

        $user = $this->resolvePayingUser();
        $currency = strtolower($validated['currency']);
        $amount = (string) $validated['amount'];
        $locale = $validated['locale'] ?? 'ar';

        $payment = ChargilyPayment::create([
            "user_id"  => $user->id,
            "status"   => "pending",
            "currency" => $currency,
            "amount"   => $amount,
        ]);
        if ($payment) {
            $baseUrl = $this->publicBaseUrl($request);
            $checkout = $this->chargilyPayInstance()->checkouts()->create([
                "metadata" => [
                    "payment_id" => $payment->id,
                ],
                "locale" => $locale,
                "amount" => $payment->amount,
                "currency" => $payment->currency,
                "description" => "Payment ID={$payment->id}",
                "success_url" => $baseUrl.'/chargilypay/back',
                "failure_url" => $baseUrl.'/chargilypay/back',
                "webhook_endpoint" => $baseUrl.'/chargilypay/webhook',
            ]);
            if ($checkout) {
                // Use Inertia location to force a full redirect to external checkout in SPA context
                return Inertia::location($checkout->getUrl());
            }
        }
        return back()->withErrors(["payment" => "Redirection failed"]);
    }
    /**
     * Your client you will redirected to this link after payment is completed ,failed or canceled
     *
     */
    public function back(Request $request)
    {
        $checkoutId = $request->input('checkout_id');
        $checkout = $checkoutId ? $this->chargilyPayInstance()->checkouts()->get($checkoutId) : null;
        $payment = null;

        if ($checkout) {
            $metadata = $checkout->getMetadata();
            if (is_array($metadata) && isset($metadata['payment_id'])) {
                $payment = ChargilyPayment::find($metadata['payment_id']);
                $this->updatePaymentStatusFromCheckout($payment, $checkout);
            }
        }

        return Inertia::render('chargilypay/result', [
            'checkout' => $checkout?->toArray(),
            'payment' => $payment?->toArray(),
        ]);
    }
    /**
     * This action will be processed in the background
     */
    public function webhook()
    {
        $webhook = $this->chargilyPayInstance()->webhook()->get();
        if ($webhook) {
            //
            $checkout = $webhook->getData();
            //check webhook data is set
            //check webhook data is a checkout
            if ($checkout and $checkout instanceof \Chargily\ChargilyPay\Elements\CheckoutElement) {
                if ($checkout) {
                    $metadata = $checkout->getMetadata();
                    if (! is_array($metadata) || ! isset($metadata['payment_id'])) {
                        return response()->json([
                            "status" => false,
                            "message" => "Missing payment metadata",
                        ], 400);
                    }

                    $payment = ChargilyPayment::find($metadata['payment_id']);

                    if ($payment) {
                        if ($checkout->getStatus() === "paid") {
                            //update payment status in database
                            $payment->status = "paid";
                            $payment->update();
                            /////
                            ///// Confirm your order
                            /////
                            return response()->json(["status" => true, "message" => "Payment has been completed"]);
                        } else if ($checkout->getStatus() === "failed" or $checkout->getStatus() === "canceled") {
                            //update payment status in database
                            $payment->status = "failed";
                            $payment->update();
                            /////
                            /////  Cancel your order
                            /////
                            return response()->json(["status" => true, "message" => "Payment has been canceled"]);
                        }
                    }
                }
            }
        }
        return response()->json([
            "status" => false,
            "message" => "Invalid Webhook request",
        ], 403);
    }

    /**
     * Ensure payment record aligns with checkout status for UI purposes.
     */
    protected function updatePaymentStatusFromCheckout(?ChargilyPayment $payment, $checkout): void
    {
        if (! $payment || ! $checkout) {
            return;
        }

        $status = $checkout->getStatus();

        if ($status === "paid") {
            $payment->status = "paid";
            $payment->save();
        }

        if ($status === "failed" || $status === "canceled") {
            $payment->status = "failed";
            $payment->save();
        }
    }

    /**
     * Provide a paying user even for public (unauthenticated) sessions.
     */
    protected function resolvePayingUser(): User
    {
        $user = auth()->user();

        if ($user) {
            return $user;
        }

        return User::firstOrCreate(
            ['email' => 'chargily-test@taleb.local'],
            [
                'name' => 'Chargily Test User',
                'password' => Hash::make(Str::random(32)),
            ],
        );
    }

    /**
     * Just a shortcut
     */
    protected function chargilyPayInstance()
    {
        return new ChargilyPay(new Credentials([
            "mode" => "test",
            "public" => "test_pk_aKsBT9DIdgZUDY9PlUNvROjrIbxJWIzCm2LM0GIK",
            "secret" => "test_sk_8j2TqepMFSz9gDlQ02D0BVZFLDHlzP2vhpaYj18p",
        ]));
    }

    /**
     * Resolve the externally reachable base URL (e.g., ngrok domain).
     */
    protected function publicBaseUrl(Request $request): string
    {
        $configured = rtrim(env('CHARGILY_PUBLIC_BASE_URL', config('app.url', '')), '/');
        if ($configured !== '') {
            return $configured;
        }

        return rtrim($request->getSchemeAndHttpHost(), '/');
    }
}
