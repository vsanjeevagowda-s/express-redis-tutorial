const express = require('express');
const responseTime = require('response-time');
const axios = require('axios');
const redis = require('redis');

const app = express();

const client = redis.createClient();

client.on('error', (err) => {
  console.log('Error ==> ', err);
});

app.use(responseTime());

app.get('/api/search', (request, resp) => {
  const query = request.query.query;
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;
  // getting result from the redis
  return client.get(`wikipedia:${query}`, (err, result) => {
    if(result){
      const resultJson = JSON.parse(result);
      return resp.status(200).json(resultJson);
    }else{
      // get result from the API
      return axios.get(searchUrl)
      .then(response => {
        const responsejson = response.data;
        client.setex(`wikipedia:${query}`, 3600, JSON.stringify({source: 'Redis cache', ...responsejson}));
        return resp.status(200).json({source: 'Wikipedia API' , ...responsejson});
      })
      .catch(err => {
        return resp.json(err);
      })
    }
  });
});

app.listen(3000, () => {
  console.log('Server listening at 3000');
})