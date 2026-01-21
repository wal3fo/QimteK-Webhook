// Quick backend test
import('./api/server.js')
  .then(() => {
    console.log('✅ Backend server module loaded successfully!');
    setTimeout(() => {
      import('http').then(({ default: http }) => {
        http.get('http://localhost:3001/api/health', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            console.log('✅ Backend is responding:', data);
            process.exit(0);
          });
        }).on('error', (err) => {
          console.log('❌ Backend not responding:', err.message);
          console.log('   Make sure the server is running with: npm run server:dev');
          process.exit(1);
        });
      });
    }, 2000);
  })
  .catch(err => {
    console.error('❌ Error loading backend:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
