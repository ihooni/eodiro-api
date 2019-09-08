import express from 'express'
import MealsController from 'Http/controllers/meal/MealsController'
import CheckMealDate from 'Http/middleware/CheckMealDate'

const router = express.Router({ mergeParams: true })

/**
 * Middleware
 */
router.use('/dates/:date', CheckMealDate.handler())

/**
 * Controller
 */
// show meal list
router.get('/dates', MealsController.index())

// check if the specific date's meal exists
router.head('/dates/:date', MealsController.head())

// show the specific date's meal
router.get('/dates/:date', MealsController.get())

export default router
