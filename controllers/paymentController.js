const axios = require('axios');
const Payment = require('../models/Payment');
const User = require('../models/User');

module.exports = {
  initiate: async (req, res) => {
    try {
      const { amount } = req.body;
      const amt = parseInt(amount, 10) || 200;
      const reference = `npl_${Date.now()}`;
      const edits = Math.floor((amt / 200) * 5);
      const payment = new Payment({ user: req.user._id, amount: amt, reference, editsPurchased: edits, status: 'pending' });
      await payment.save();
      // Initialize with Paystack
      const initRes = await axios.post('https://api.paystack.co/transaction/initialize', {
        email: req.user.email,
        amount: amt * 100,
        reference,
        callback_url: `${req.protocol}://${req.get('host')}/payments/verify`
      }, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      });
      return res.json({ authorization_url: initRes.data.data.authorization_url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Payment initialization failed' });
    }
  },

  verify: async (req, res) => {
    try {
      const { reference } = req.query || req.body;
      if (!reference) return res.status(400).send('Missing reference');
      const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
      const data = verifyRes.data;
      const payment = await Payment.findOne({ reference });
      if (!payment) return res.status(404).send('Payment not found');
      if (data.data.status === 'success') {
        payment.status = 'success';
        await payment.save();
        const user = await User.findById(payment.user);
        user.paidEdits += payment.editsPurchased;
        user.editsLeft += payment.editsPurchased;
        await user.save();
        return res.render('payments/success', { payment });
      }
      payment.status = 'failed';
      await payment.save();
      res.render('payments/failed', { payment });
    } catch (err) {
      console.error(err);
      res.status(500).send('Verification error');
    }
  }
};
