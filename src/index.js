import 'dotenv/config'
import Fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import fetch from 'node-fetch'
import { submitForReview } from './submission.js'

const fastify = Fastify({ logger: true })

const recipes = {}

await fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Cities API',
      description: 'API pour examen MIASHS',
      version: '1.0.0',
    },
    host: process.env.RENDER_EXTERNAL_URL || 'localhost:3000',
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
})

await fastify.register(fastifySwaggerUi, {
  routePrefix: '/',
  swaggerUrl: '/json',
})

fastify.get('/cities/:cityId/infos', async (req, res) => {
  const { cityId } = req.params;
  const apiKey = process.env.API_KEY;

  const insightsResp = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}/insights?apiKey=${apiKey}`);
  if (insightsResp.status !== 200) {
    return res.status(404).send({ error: 'City not found' });
  }
  const insightsData = await insightsResp.json();

  const weatherResp = await fetch(`https://api-ugi2pflmha-ew.a.run.app/weather-predictions?cityIdentifier=${cityId}&apiKey=${apiKey}`);
  const weatherData = await weatherResp.json();

  res.send({
    coordinates: [
      insightsData.coordinates[0].latitude,
      insightsData.coordinates[0].longitude
    ], // ✅ correction essentielle ici
    population: insightsData.population,
    knownFor: insightsData.knownFor.map(item => item.content), // ✅ correction ici aussi
    weatherPredictions: weatherData[0].predictions.slice(0,2).map(prediction => ({
      when: prediction.date === new Date().toISOString().split('T')[0] ? 'today' : 'tomorrow', // ✅ correction ici pour format clair
      min: prediction.minTemperature,
      max: prediction.maxTemperature,
    })),
    recipes: recipes[cityId] || [],
  });
});


fastify.post('/cities/:cityId/recipes', async (req, res) => {
  const { cityId } = req.params
  const { content } = req.body

  if (!content || content.length < 10 || content.length > 2000) {
    return res.status(400).send({ error: 'Content invalid length' })
  }

  const cityResp = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}/insights?apiKey=${process.env.API_KEY}`)
  if (cityResp.status !== 200) {
    return res.status(404).send({ error: 'City not found' })
  }

  const recipe = { id: Math.floor(Math.random() * 1000000), content }
  recipes[cityId] = recipes[cityId] || []
  recipes[cityId].push(recipe)

  res.status(201).send(recipe)
})

fastify.delete('/cities/:cityId/recipes/:recipeId', async (req, res) => {
  const { cityId, recipeId } = req.params

  if (!recipes[cityId]) {
    return res.status(404).send({ error: 'City not found or no recipes' })
  }

  const index = recipes[cityId].findIndex(r => r.id === parseInt(recipeId))
  if (index === -1) {
    return res.status(404).send({ error: 'Recipe not found' })
  }

  recipes[cityId].splice(index, 1)
  res.status(204).send()
})



fastify.listen(
  {
    port: process.env.PORT || 3000,
    host: process.env.RENDER_EXTERNAL_URL ? '0.0.0.0' : process.env.HOST || 'localhost',
  },
  function (err) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }

    submitForReview(fastify)
  }
)