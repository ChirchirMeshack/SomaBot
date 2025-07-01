import { Router } from 'express';
const router = Router();

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', domain: 'users' });
});

export default router; 