import Stripe from 'stripe';

export const onRequestPost = async (context: any) => {
    const { request, env } = context;

    if (!env.STRIPE_SECRET_KEY) {
        return new Response(JSON.stringify({ error: 'Stripe secret key not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    try {
        const { amount } = await request.json();

        if (!amount || isNaN(amount) || amount <= 0) {
            return new Response(JSON.stringify({ error: 'Invalid amount' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Donation to Online Sheikh AI',
                            description: 'Support the Ummah with AI-powered Islamic guidance',
                        },
                        unit_amount: Math.round(amount * 100), // Stripe expects amount in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${new URL(request.url).origin}/?donation=success`,
            cancel_url: `${new URL(request.url).origin}/?donation=cancel`,
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
