import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFound } from './middlewares/errorHandler';

const app = express();

/* ================== CORS PHẢI ĐỨNG ĐẦU ================== */
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.217:3000',
  'https://coffee-shop-frontend-production.up.railway.app',
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

/* ✅ CHO PHÉP PREFLIGHT */
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

/* ================== SAU ĐÓ MỚI HELMET ================== */
app.use(helmet());

/* ================== BODY ================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* ================== ROUTES ================== */
app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1', routes);

/* ================== ERROR ================== */
app.use(notFound);
app.use(errorHandler);

export default app;
