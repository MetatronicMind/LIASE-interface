// import { RateLimiterMemory } from 'rate-limiter-flexible';
// const rateLimit = new RateLimiterMemory({
//     points: 10, // maximum number of requests allowed
//     duration: 1, // time frame in seconds
// });

// export async function rateLimiter (req, res) {
//     const consumeResult = await rateLimit.consume(req.ip);

//     try {
//         if (consumeResult.consumedPoints > 0) {
//             next(); // request allowed, proceed with handling the request
//         }
//         else {
//             res.status(429).send('Too Many Requests'); // request limit exceeded, respond with an appropriate error message
//         }
//     }
//     catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// };
// export default{ rateLimiter };
