const axios = require('axios');
const Payment = require('../models/Payment');
const User = require('../models/User');

module.exports = {
  initiate: async (req, res) => {
    try {
      const batches = Math.max(1, Math.min(10, parseInt(req.body.batches, 10) || 1));
      const amt = batches * 200;
      const edits = batches * 5;
      const reference = `npl_${Date.now()}_${req.user._id}`;
      const payment = new Payment({ user: req.user._id, amount: amt, reference, editsPurchased: edits, status: 'pending' });
      await payment.save();
      const initRes = await axios.post('https://api.paystack.co/transaction/initialize', {
        email: req.user.email,
        amount: amt * 100,
        reference,
        callback_url: `${req.protocol}://${req.get('host')}/payments/verify`,
        metadata: { batches, editsPurchased: edits, userId: String(req.user._id) }
      }, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      });
      return res.json({ authorization_url: initRes.data.data.authorization_url, amount: amt, edits, batches });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Payment initialization failed' });
    }
  },

  verify: async (req, res) => {
    try {
      const reference = req.query.reference || req.query.trxref || req.body?.reference;
      if (!reference) return res.redirect('/dashboard/settings?error=Missing+payment+reference');
      const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
      const data = verifyRes.data;
      const payment = await Payment.findOne({ reference });
      if (!payment) return res.redirect('/dashboard/settings?error=Payment+not+found');
      if (data.data.status === 'success') {
        if (payment.status !== 'success') {
          payment.status = 'success';
          await payment.save();
          const user = await User.findById(payment.user);
          if (user) {
            user.paidEdits += payment.editsPurchased;
            user.editsLeft += payment.editsPurchased;
            await user.save();
          }
        }
        return res.redirect('/dashboard/settings?payment=success');
      }
      payment.status = 'failed';
      await payment.save();
      res.redirect('/dashboard/settings?error=Payment+failed');
    } catch (err) {
      console.error(err);
      res.redirect('/dashboard/settings?error=Verification+error');
    }
  }
};
