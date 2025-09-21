const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");

router.get("/", reviewController.getReviews);

router.post("/", reviewController.createReview);

router.get("/average", reviewController.getDoctorAverageRating);

router.get("/trends", reviewController.getReviewTrends);

router.get("/top-doctors", reviewController.getTopDoctorsByRating);

router.get('/reviews/doctor/:doctor_id', reviewController.getReviewsByDoctorId);
module.exports = router;
