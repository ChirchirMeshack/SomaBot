import http from 'http';

const PORT = 3000;

const server = http.createServer((req: any, res: { statusCode: number; setHeader: (arg0: string, arg1: string) => void; end: (arg0: string) => void; }) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Server running');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment: development');
}); 