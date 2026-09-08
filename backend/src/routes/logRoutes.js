const express = require('express');
const logController = require('../controllers/logController');
const validateLog = require('../middleware/validateLog');
const { bulkLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/bulk', bulkLimiter, logController.createBulkLogs);
router.post('/', validateLog, logController.createLog);
router.get('/', logController.getLogs);

module.exports = router;
