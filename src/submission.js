export const submitForReview = async (fastify) => {
  if (process.env.RENDER_EXTERNAL_URL) {
    if (!process.env.API_KEY) {
      fastify.log.error(
        'API_KEY is not set. Please set it as an environment variable on render.com to submit your API for review.'
      )
      return
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const response = await fetch(`https://api-ugi2pflmha-ew.a.run.app/group/submissions?apiKey=${process.env.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          apiUrl: process.env.RENDER_EXTERNAL_URL,
          gitRepo: process.env.RENDER_GIT_REPO_SLUG,
        }),
      })

      if (response.ok) {
        fastify.log.info('API submitted for review, see https://miashs-exam-api.web.app/')
      } else {
        throw new Error(response.status)
      }
    } catch (error) {
      fastify.log.error('Error while submitting your API for review:', error)
    }
  }
}