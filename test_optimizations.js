// Script de test pour vérifier les optimisations
const http = require('http');

function makeRequest(path, callback) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      callback(null, { statusCode: res.statusCode, data });
    });
  });

  req.on('error', (err) => {
    callback(err);
  });

  req.end();
}

async function testMultipleRequests() {
  console.log('🧪 Test des optimisations de performance...\n');
  
  // Test 1: Requêtes multiples sur /api/settings
  console.log('📊 Test 1: 10 requêtes simultanées sur /api/settings');
  const startTime = Date.now();
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(new Promise((resolve) => {
      makeRequest('/api/settings', (err, result) => {
        if (err) {
          console.log(`❌ Requête ${i + 1}: Erreur - ${err.message}`);
        } else {
          console.log(`✅ Requête ${i + 1}: Status ${result.statusCode}`);
        }
        resolve();
      });
    }));
  }
  
  await Promise.all(promises);
  const endTime = Date.now();
  console.log(`⏱️  Temps total: ${endTime - startTime}ms\n`);
  
  // Test 2: Redirection /vite.svg
  console.log('🔍 Test 2: Redirection /vite.svg vers /favicon.svg');
  makeRequest('/vite.svg', (err, result) => {
    if (err) {
      console.log(`❌ Erreur: ${err.message}`);
    } else {
      console.log(`✅ Status: ${result.statusCode}`);
      console.log(`📍 Redirection: ${result.data}`);
    }
    console.log('\n✨ Test terminé!');
    process.exit(0);
  });
}

// Attendre que le serveur soit prêt
console.log('⏳ Attente du démarrage du serveur...');
setTimeout(() => {
  testMultipleRequests();
}, 5000);