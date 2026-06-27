const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const messageController = require('../controllers/messageController');
const profileController = require('../controllers/profileController');
const { ensureAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(ensureAuthenticated);
router.get('/', dashboardController.home);
router.get('/inbox', messageController.listInbox);
router.get('/message/:id', messageController.viewMessage);
router.delete('/message/:id', messageController.deleteMessage);
router.get('/profile', dashboardController.profile);
router.post('/profile/update', upload.single('profilePhoto'), profileController.updateProfile);
router.post('/password/update', profileController.changePassword);
router.post('/theme/update', profileController.updateTheme);
router.post('/mode/update', profileController.updateMode);
router.post('/pause', profileController.pauseLink);
router.post('/notifications', profileController.toggleNotifications);
router.post('/delete', profileController.deleteAccount);

module.exports = router;
