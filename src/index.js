import 'dotenv/config'
import Fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { submitForReview } from './submission.js'

const fastify = Fastify({ logger: true })

const recipes = {}

// Swagger config
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

// Route GET cities infos
fastify.get('/cities/:cityId/infos', async (req, res) => {
  const { cityId } = req.params
  const apiKey = process.env.API_KEY
  
  const cityResp = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}/infos?apiKey=${apiKey}`)
  if (cityResp.status !== 200) {
    return res.status(404).send({ error: 'City not found' })
  }
  const cityData = await cityResp.json()

  const weatherResp = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}/weather?apiKey=${apiKey}`)
  const weatherData = await weatherResp.json()

  res.send({
    coordinates: cityData.coordinates,
    population: cityData.population,
    knownFor: cityData.knownFor,
    weatherPredictions: weatherData.weatherPredictions,
    recipes: recipes[cityId] || [],
  })
})

// Route POST add recipe
fastify.post('/cities/:cityId/recipes', async (req, res) => {
  const { cityId } = req.params
  const { content } = req.body
  if (!content || content.length < 10 || content.length > 2000) {
    return res.status(400).send({ error: 'Content invalid length' })
  }

  const cityResp = await fetch(`https://api-ugi2pflmha-ew.a.run.app/cities/${cityId}/infos?apiKey=${process.env.API_KEY}`)
  if (cityResp.status !== 200) {
    return res.status(404).send({ error: 'City not found' })
  }

  const recipe = { id: Date.now(), content }
  if (!recipes[cityId]) recipes[cityId] = []
  recipes[cityId].push(recipe)

  res.status(201).send(recipe)
})

// Route DELETE recipe
fastify.delete('/cities/:cityId/recipes/:recipeId', async (req, res) => {
  const { cityId, recipeId } = req.params

  if (!recipes[cityId]) {
    return res.status(404).send({ error: 'City not found or no recipes' })
  }

  const index = recipes[cityId].findIndex((r) => r.id === Number(recipeId))
  if (index === -1) {
    return res.status(404).send({ error: 'Recipe not found' })
  }

  recipes[cityId].splice(index, 1)

  res.status(204).send()
})

// Route Swagger JSON


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

    //////////////////////////////////////////////////////////////////////
    // Don't delete this line, it is used to submit your API for review //
    // everytime your start your server.                                //
    //////////////////////////////////////////////////////////////////////
    submitForReview(fastify)
  }
)
