const express = require('express');
const router = express.Router();
const stripe = require('stripe')('sk_test_51P4OUVG88BgISNgdudyCc269uAYJyTpTS7ndz7CrGZF2fpivShhsyhM0gzcYM7fZ2MsvgIEA9eamKDf5bUrFRWiG0099B74I8z');

router.post('/pay', async (req, res) => {
    const { amount, meetingDetails, returnUrl } = req.body; // Accept `returnUrl` from the request body

    console.log('Payment request received with the following details:');
    console.log(`Amount: ${amount}`);
    console.log('Meeting Details:', meetingDetails);
    console.log('Return URL:', returnUrl);

    try {
        // Create a Stripe Checkout session
        console.log('Creating Stripe checkout session...');
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',  // Adjust currency as needed
                        product_data: {
                            name: 'On Ride', // Customize this product name as needed
                        },
                        unit_amount: amount * 100, // Stripe expects amount in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: returnUrl, // Use the dynamically passed return URL
            cancel_url: 'http://localhost:3000/cancel', // Cancel URL
            metadata: meetingDetails, // Store meeting details as metadata
        });

        console.log('Stripe checkout session created successfully:', session);

        // Respond with the URL to redirect the user to the Stripe checkout page
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating Stripe payment session:', error);
        res.status(500).json({ error: 'An error occurred during the payment process.' });
    }
});

module.exports = router;
