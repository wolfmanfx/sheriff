import express from 'express';
import { SheriffApiController } from './controller';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();
app.use(express.json());

const controller = new SheriffApiController();
controller.register(app);

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
