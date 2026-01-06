import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

// Basic middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Root Route only
app.get('/', (req, res) => res.send('Finance Engine Core Active (Serverless Mode)'));

export default app;