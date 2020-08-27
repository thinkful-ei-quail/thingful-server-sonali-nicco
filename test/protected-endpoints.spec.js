const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')
const supertest = require('supertest')

describe('Protected endpoints', () => {
  let db

  const {
    testThings,
    testUsers,
    testReviews,
  } = helpers.makeThingsFixtures()

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  beforeEach('insert things', () =>
    helpers.seedThingsTables(
      db,
      testUsers,
      testThings,
      testReviews,
    )
  )

  const protectedEndpoints = [
    {
      name: 'GET /api/things/:thing_id',
      path: '/api/things/1'
    },
    {
      name: 'GET /api/things/:thing_id/reviews',
      path: '/api/things/1/reviews'
    }
  ]

  protectedEndpoints.forEach(endpoint => {
    describe(endpoint.name, () => {
      it(`responds with 401 and 'Missing basic token' when no basic token`, () => {
        return supertest(app)
          .get(endpoint.path)
          .expect(401, { error: 'Missing basic token' })
      })

      it(`responds 401 'Unauthorized request' when no credentials in token`, () => {
        const userNoCreds = { user_name: '', password: '' }
        return supertest(app)
          .get(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(userNoCreds))
          .expect(401, { error: 'Unauthorized request' })
      })

      it(`responds 401 'Unauthorized request' when invalid user`, () => {
        const userInvalidCreds = { user_name: 'not-user', password: 'existy'}
        return supertest(app)
          .get(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(userInvalidCreds))
          .expect(401, { error: 'Unauthorized request' })
      })

      it(`responds 401 'Unauthorized request' when invalid password`, () => {
        const userInvalidPass = { user_name: testUsers[0].user_name, password: 'wrong'}
        return supertest(app)
          .get(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(userInvalidPass))
          .expect(401, { error: 'Unauthorized request' })
      })
    })
  })
})