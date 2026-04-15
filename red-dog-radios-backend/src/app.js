require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');

const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./modules/auth/auth.route');
const organizationRoutes = require('./modules/organizations/organization.route');
const opportunityRoutes = require('./modules/opportunities/opportunity.route');
const matchRoutes = require('./modules/matches/match.route');
const applicationRoutes = require('./modules/applications/application.route');
const agencyRoutes = require('./modules/agencies/agency.route');
const alertRoutes = require('./modules/alerts/alert.route');
const outboxRoutes = require('./modules/outbox/outbox.route');
const digestRoutes = require('./modules/digests/digest.route');
const aiRoutes = require('./modules/ai/ai.route');
const dashboardRoutes = require('./modules/dashboard/dashboard.route');
const onboardingRoutes = require('./modules/onboarding/onboarding.route');
const settingsRoutes = require('./modules/settings/settings.route');
const funderRoutes = require('./modules/funders/funder.route');
const winRoutes = require('./modules/wins/win.route');
const outreachRoutes = require('./modules/outreach/outreach.route');
const followupRoutes = require('./modules/followups/followup.route');
const trackerRoutes = require('./modules/tracker/tracker.route');
const ashleenRoutes = require('./modules/ashleen/ashleen.route');
const adminRoutes = require('./modules/admin/admin.route');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);

// Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Red Dog Radio Grant Intelligence API',
      version: '1.0.0',
      description: 'Grant Intelligence Platform — full API reference',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/modules/**/*.route.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const mongoStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    success: true,
    message: 'Red Dog Radio Grant Intelligence API is running',
    environment: process.env.NODE_ENV,
    checks: {
      mongo: { status: mongoStates[mongoStatus] || 'unknown', ok: mongoStatus === 1 },
      openai: { configured: !!process.env.OPENAI_API_KEY },
      smtp: { configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) },
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/agencies', agencyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/outbox', outboxRoutes);
app.use('/api/digests', digestRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/funders', funderRoutes);
app.use('/api/wins', winRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/ashleen', ashleenRoutes);
app.use('/api/admin', adminRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test-email', async (req, res) => {
    try {
      const { sendEmail } = require('./config/resend.config');

      // Allow ?to=anyemail@gmail.com in URL for testing
      const testTo = req.query.to || process.env.ADMIN_EMAIL;

      const result = await sendEmail({
        to: testTo,
        subject: 'Red Dog Email Test ' + new Date().toISOString(),
        html: `
        <div style="font-family:Arial;padding:40px;max-width:500px;
          margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;">
          <h1 style="color:#ef3e34;margin-top:0;">Email is working!</h1>
          <p>Gmail + Nodemailer working correctly.</p>
          <p style="color:#6b7280;font-size:13px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      });

      res.json({ result, sentTo: testTo });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
