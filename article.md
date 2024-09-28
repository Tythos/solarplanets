What was once a one-parter intended to turn around over the weekend for a challenge submission has turned into a three-parter with a brief interlude for some numerics! What could be tastier?

## What Are We Doing Here?

This is effectively part two of our analysis regarding how the frontend challenge from the other week on dev.to could be realized using THREE.js and a little bit (okay, maybe too much) of knowledge from the aerospace world.

Specifically, if you recall [our previous article](https://dev.to/tythos/2052-random-software-projects-devto-frontend-challenge-27a9): we've reached a place where we have 3d planets around a sun--but they're all in a flat circle, perfectly lined up with each other (even if they're realistically ranged apart). We want them to be moving through 3d space, and it would be even better if we could compute those 3d positions from the actual orbits of the planets themselves in realtime!

![when we last left off](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/sd5wf4ln7daz30eos08n.png)

This is entirely possible thanks to a neat high-power trick I like to call: "implementing algorithms and test cases from a handy textbook". (This is a great exercise and an effective way to build up a library of really useful, well-proven tools, while simultaneously sharpening your own knowledge.) In particular, we'll be using one of my go-to textbooks, [Curtis's "Orbital Mechanics for Engineering Students"](https://www.sciencedirect.com/book/9780080977478/orbital-mechanics-for-engineering-students). He has a chapter on planetary trajectories, including a subsection specifically on computing planetary ephemerides from a known table or model of orbital elements and their drift.

> _Fun side note: you can read [the original paper](http://fgg-web.fgg.uni-lj.si/~/mkuhar/pouk/GA/Seminar/Zvezdni_katalogi_in_efemeride/JPL-DE_LE405-Orbital%20Ephemerides%20of%20the%20Sun,%20Moon,%20and%20Planets.pdf) on which his approach is based, including the derivation of the equations and how his numerical data was put together. Good stuff! If you wanted higher-fidelity models, you would do something like evaluting the 17th-order polynomials from a [JPL Spice kernel](https://naif.jpl.nasa.gov/naif/data.html). But this approach, where we use a mean-drift rate of planetary orbital elements about an established epoch, is still pretty good._

But, as a side bonus, this also lets us explore a useful pattern for single-file Javascript modules. We've covered this briefly in some previous articles, before we started doing engineering content, but this will let us demonstrate how a real package can be published and automated. We'll include documentation, testing, coverage, and a degree of type-hinting, in addition to demonstrating the software engineering process itself.

## Let's Get It Started

![I had to include one meme, at least](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0rtv99fj3e48kfhwkk90.gif)

So where do we begin? Let's start with an empty yarn project and git-init it:

```sh
yarn init -y .
git init .
git add -A
git commit -m "initial content commit"
```

Then, we'll crack open a new `index.mjs` and get going.

But get going doing what?

Recall, our intended purpose is to compute the position of the planets at any given point in time. Effectively, we want a vector as a function of the planetary element model and a specific `Date` value. We've already seen what that table might look like, but we'll want this data to be usable in a self-contained Javascript module. Here's a part of the table from the original paper:

![standish table](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/izsqdtij9ckd989pavq1.png)

For the purposes of avoiding dependencies, this means we'll transcribe it into a `standish_catalog.json` file. From the Curtis text, that means different entries for each planet that look something like this:

```js
{
    "mercury": {
        "a_au": 0.38709893,
        "da_au": 0.00000066,
        "e": 0.20563069,
        "de": 0.00002527,
        "inc_deg": 7.00487,
        "dinc_sec": -23.51,
        "raan_deg": 48.33167,
        "draan_sec": -446.30,
        "lop_deg": 77.4545,
        "dlop_sec": 573.57,
        "ml_deg": 252.25084,
        "dml_sec": 538101628.29
    },
    ...
}
```

What's going on here?

## The Model

We have six values, a variation on the [classical orbital elements](https://en.wikipedia.org/wiki/Orbital_elements), for each planet. Those values are evaluated at a specific epoch, J2000 (noon UTC on January 1st, 2000). We also have a "rate" for each value, the mean rate of change per Julian *century*. (These elements don't change very quickly! But they do change, or "drift".)

* `a_au` is the "semi-major axis". Every orbit makes an ellipse, and this effectively measures the scale of the ellipse. In particular, this value has units of `au`, or "astronomical units". `1 [au]` is roughly equal to the distance between the earth and the sun.

* `e` is the "eccentricity", which measures how elliptical (or lop-sided) the orbit is. If this is 0, the orbit is a circle. If this is 1, the orbit is a parabola. But, this value for planets will typically be somewhere between 0 and 1--an ellipse.

* `inc_deg` is the "inclination" of the orbital plane with respect to some reference--in our case, the inertial heliocentric ecliptic coordinate frame. Sometimes you will hear this referred to as ["ICRF" or "ICRS"](https://en.wikipedia.org/wiki/International_Celestial_Reference_System_and_its_realizations).

* `raan_deg` defines the "right-ascension of the ascending node". This is the angle from some reference (the X vector) rotated about the Z vector until we meet the point at which the orbital plane intersects (in ascension, as opposed to descension) our X-Y reference plane.

* `lop_deg` is "longitude of perhelion", which is the sum of two measurements: the ascending node (see above) and the "argument of perhelion", which is the angle (within the orbital plane) from the ascending node to perhelion, the point of closest approach to the sun.

`ml_deg` is the "mean longitude" is a similar sum of angles, but instead for the "mean" (constant rate in time) longitude of the body in question at some point in time (in other words, our epoch).

For a specific point in time, we will compute the values for each of these elements as a linear "drift" from our epoch data. For `a_au`, this means a drift rate of astronomical units per Julian century. For `e`, this means a drift rate of eccentricity (which is a unitless ratio) per Julian century. For all other values, which are angles, we express this drift rate in "seconds" (as in, degrees/minutes/seconds) per Julian century.

## The Algorithm

We have enough information now to construct the "body" or top level of our algorithm. There will be plenty of opportunities to fill in the gap with various utility functions, but I find it helps to first define the "entry points", or main functions an external user might call, and then decompose into smaller behaviors before you begin implementation from the bottom-up.

So what does the top-level call look like? Let's use this to start writing our `index.mjs` content.

```js
/**
 * Computes the position and velocity of a given planetary model as evaluated at the given datetime. Results are returned in a "sun-centered inertial", which is defined in the heliocentric ecliptic frame of reference.
 * 
 * @param {Object} planetaryOrbitalElements - Planetary orbital elements model, including mean (offset and rate) coefficients
 * @param {Date} dt - Datetime at which state will be evaluated
 * @returns {Array} - Two-element array containing r and v as evaluated in the heliocentric ecliptic frame; each element is a three-element array of numeric values in [km] and [km/s], respectively
 */
export function getRvFromElementsDatetime(planetaryOrbitalElements, dt) {
}
```

A couple of notes here:

* We'll be exporting *everything*, mainly because to want to thoroughly test each "level" of our algorithm. More on that later.

* You'll note some nice JSDoc-style header comments here. VS Code in particular does a good job of auto-expanding these above a function header once you start with a `/**`. You can even use JSDoc parameter and return annotations to perform a degree of type-checking in vanilla Javascript. But I mainly like to use it to remind myself of exactly what arguments and return values are supposed to be.

* We're using our own internal / native Javascript Arrays (and Arrays-of-Arrays) for linear algebra types like vectors and matrices, respectively. In this case, our return position and velocity are each three-element Arrays. You could also use a numerical library (like Sylvester) or reuse the linear algebra types from THREE.js, but for the purpose of being self-contained and dependency-free (for runtime at least), this is good for now.

We'll break down the body of this function around the steps described in Curtis's algorithm ("Algorithm 8.1", if I remember correctly). 

## The Implementation

First, we need to compute the julian date value from the julian date number and universal time. We'll also convert this into julian centuries from J200 so we can compute our orbital elements.

```js
// determine julian date value and julian centuries
const y = dt.getUTCFullYear();
const m = dt.getUTCMonth() + 1; // thanks, javascript!
const d = dt.getUTCDate(); // THANKS, JAVASCRIPT!!!
const H = dt.getUTCHours();
const M = dt.getUTCMinutes();
const S = dt.getUTCSeconds() + dt.getUTCMilliseconds() * 1e-3;
const J0 = getJ0FromDatevec(y, m, d);
const UT = getUtFromTimevec(H, M, S);
const JD = getJdFromDateTime(J0, UT);
const T0 = getJulianCenturies(JD);
```

Note that we've defined some utility functions here that we'll implement later, because we know roughly what the call signature needs to be. Next, we need to interpolate the elements themselves. It would help here to use some generic linear interpolation function--in this case, we'll call it `getCurrentElements()`. We'll also define some unit conversion constants. By the time we've computed the elements, we want them to be in SI units for internal representation (note the unit abbreviations following the underscores in variable names), and for angles that includes a positive-modulus function for wrapping within the range `[0, 2 * Math.PI]`.

```js
// interpolate (and convert) planetary elements
const d2r = Math.PI / 180;
const au2km = 1.49597871e8;
const a_km = getCurrentElements(planetaryOrbitalElements.a_au * au2km, planetaryOrbitalElements.da_au * au2km, T0);
const e = getCurrentElements(planetaryOrbitalElements.e, planetaryOrbitalElements.de, T0);
const inc_rad = posmod(getCurrentElements(planetaryOrbitalElements.inc_deg * d2r, planetaryOrbitalElements.dinc_sec / 3600 * d2r, T0), 2 * Math.PI);
const raan_rad = posmod(getCurrentElements(planetaryOrbitalElements.raan_deg * d2r, planetaryOrbitalElements.draan_sec / 3600 * d2r, T0), 2 * Math.PI);
const lop_rad = posmod(getCurrentElements(planetaryOrbitalElements.lop_deg * d2r, planetaryOrbitalElements.dlop_sec / 3600 * d2r, T0), 2 * Math.PI);
const ml_rad = posmod(getCurrentElements(planetaryOrbitalElements.ml_deg * d2r, planetaryOrbitalElements.dml_sec / 3600 * d2r, T0), 2 * Math.PI);
```

Next, we'll compute angular momentum (the scalar, but still an incredibly helpful value), as well as the argument of perhelion and mean anomaly.

```js
// compute angular momentum, argument of periapsis, and mean anomaly from elements
const h_km2ps = getAngularMomentum(a_km, e);
const aop_rad = getAopFromLopRaan(lop_rad, raan_rad);
const M_rad = getMaFromMlLop(ml_rad, lop_rad);
```

Again, we have some utility functions we know we'll want later. They aren't complicated, but pulling them apart (even if we don't reuse them) will give us useful "units" of code against which we can write unit tests. We're now ready for the "tricky" part--solving [Kepler's equation](https://en.wikipedia.org/wiki/Kepler%27s_equation), a transcendental equation that must be solved numerically (in this case using the Newton-Raphson method).

```js
// solve kepler's equation for true anomaly
const E_rad = getEaFromMaE(M_rad, e);
const tht_rad = getTaFromEaE(E_rad, e);
```

Once we have "true anomaly", we've finished collecting all the elements we need. We can now compute the planet's coordinates, first in a "perifocal" plane. The perifocal plane is fixed with respect to the ellipse, with the ellipse in the X-Y plane and -X pointing towards periapsis (+X points towards apopasis). These position and velocity vectors are easily determined from angular momentum, eccentricity, and the true anomaly.

```js
// compute perifocal states
const rPqw_km = getRpqwFromHETht(h_km2ps, e, tht_rad);
const vPqw_kmps = getVpqwFromHETht(h_km2ps, e, tht_rad);
```

Now that we have vectors in the perifocal plane, we simply need to transform it back into the heliocentric equinoctal frame. This is done with a "3-1-3" series of rotations, using the other three angles we computed, concatenated into a frame transformation we'll call `Qpqw2eci` (though we're not in ECI, which is earth-centered, the rotation transformations are the same). Once computed, we can multiply our vectors by this frame transformation to realize the vectors in an "inertial" coordinate frame.

```js
// convert to inertial states and return
const Qpqw2eci = getQpqw2eci(raan_rad, inc_rad, aop_rad);
const rHcec_km = getMatVec(Qpqw2eci, rPqw_km);
const vHcec_kmps = getMatVec(Qpqw2eci, vPqw_kmps);
```
 
(Note in this case we use `getMatVec()`, a utility function that evaluates a matrix multiplied by a vector. There are a variety of linear algebra operations we need to implement ourselves, since we're using native arrays and not a third-party math library, but they're not particularly complicated.)

```js
return [
    rHcec_km,
    vHcec_kmps
];
```

Finally, we return this pair of vectors from the function--and we're done!

## A Word About Utility Functions

We won't walk through every utility function here--you can always see the source `index.mjs` in the GitHub project. But there are a few worth a closer look.

Here's our `posmod()` function, which we use because the native Javascript modulus operator (say, for `x % X`) does not return a value between 0 and `X`, but rather between `-X` and `+X`. We want to "clamp" several values (mostly angles) to a positive range instead.

```js
/**
 * Floating-point modulus that evaluates a % b to the positive range [0,b)
 * 
 * @param {Number} a - Numerical subject value
 * @param {Number} b - Modulo
 * @returns {Number} - a mod b within [0,b)
 */
export function posmod(a, b) {
    const c = a % b;
    return c < 0 ? c + b : c;
}
```

Here's probably the "meatiest" function in the bunch, which uses the Newton-Raphson method to find the root of our transcendental Kepler's function. This helps us solve for "eccentric" anomaly from mean anomaly and eccentricity, after which we can easily compute "true" anomaly.

```js
/**
 * Computes eccentric anomaly from mean anomaly and eccentricity. This implements equation Eq. 3.14, solving Kepler's equation numerically via Alg. 3.1.
 * 
 * @param {Number} M_rad - Mean anomly [rad]
 * @param {Number} e - Eccentricity
 * @returns {Number} - Eccentric anomaly [rad]
 */
export function getEaFromMaE(M_rad, e) {
    let E_rad = M_rad < Math.PI ? M_rad + 0.5 * e : M_rad - 0.5 * e;
    let isConverged = false;
    let isOverrun = false;
    let n = 0;
    const nMax = 1e3;
    const tol = 1e-8;
    while (!isConverged && !isOverrun) {
        const f = E_rad - e * Math.sin(E_rad) - M_rad;
        const df = 1 - e * Math.cos(E_rad);
        const r = f / df;
        n += 1;
        isConverged = Math.abs(r) < tol;
        isOverrun = nMax < n;
        if (!isConverged) {
            E_rad = E_rad - r;
        }
    }
    return E_rad;
}
```

Of course, there's no guarantee we will converge! But for planets, it is highly likely, since the elements we are dealing with are fairly mild (compared to edge cases). Lastly, it's also worth taking a look at how we compute perifocal position, which is surprisingly simple but illustrates how we can handle Arrays as linear algebra types with a little help from judicious JSDoc comments:

```js
/**
 * Computes position in perifocal (PQW) frame given angular momentum, eccentricity, and true anomaly.
 * 
 * @param {Number} h_km2ps - Angular momentum scalar [km^2/s]
 * @param {Number} e - Eccentricity
 * @param {Number} tht_rad - True anomaly [rad]
 * @returns {Array} - Position in PQR frame [km]
 */
export function getRpqwFromHETht(h_km2ps, e, tht_rad, mu_km3ps2 = MU_SUN_KM3PS2) {
    const c = h_km2ps * h_km2ps / (mu_km3ps2 * (1 + e * Math.cos(tht_rad)));
    return [
        c * Math.cos(tht_rad),
        c * Math.sin(tht_rad),
        0
    ];
}
```

## Does It Work?

One of the great things about implementing an algorithm from a textbook is that you have all sorts of great reference cases to build a test suite from. In this case, this is true for the top-level algorithm and practically every function underneath it. Let's add a `test.mjs` file and look at how this could be done.

We'll use Jasmine, a useful test framework for Javascript that works in a variety of contexts, has an elegant declaration style, and includes support for several widely-compatible report formats. From our test module, we'll export a key-value pair of test descriptions and test methods. Here's a super-simple "smoke test" that simply ensures that the single-file module can be imported and that tests can be run.

```js
import * as solarplanets from "./index.mjs";

export default {
    "can be tested": () => {
        expect(true).toEqual(true);
    }
}
```

Of course, we'll want to add more than this! We want to test every line of code (or at least every function call). This will include a combination of "examples" we reproduce from the textbook (which we'll reference in the test description) and specific tests for common foot-guns like calculation of rotation matrices (vs. frame transformations). For example, here's "Exercise 5.6" from the Curtis text, reproduced as another test entry in our `tests.mjs` module.

```js
...
    "can reproduce example 5.6 T0": () => {
        const J0 = solarplanets.getJ0FromDatevec(2004, 3, 3);
        const UT = solarplanets.getUtFromTimevec(4, 30, 0);
        const JD = solarplanets.getJdFromDateTime(J0, UT);
        expect(solarplanets.getJulianCenturies(JD)).toBeCloseTo(0.041683778, 1e-3);
    },
...
```

And here's how we verify we didn't get our rotation matrices mixed up!

```js
    "can rotate vector about x": () => {
        const actual = solarplanets.getMatVec(solarplanets.r1(0.5 * Math.PI), [0, 1, 0]);
        const expected = [0, 0, 1];
        for (let i = 0; i < 3; i += 1) {
            expect(actual[i]).toBeCloseTo(expected[i], 1e-3);
        }
    },
```

All in all, we have about 325 lines of tests, compared to about 417 lines of source in our `index.mjs`. I find this is about right--you want good coverage but if you start approaching the point where the SLOC for tests is greater than the SLOC for the source it evaluates, then you might want to take a step back and think about how prudently you are evaluating your code. It's easy to go overboard--think about what you really need to assert in your algorithm, versus what you're just writing for the purpose of writing predetermined tests (or for squeezing that last percentage of test coverage--we've all been there!)

## Package Scripts

Let's revisit our package specification. First we need to add some development dependencies (the only ones we have, since the module implementation is self-contained). This includes development tools for testing, documentation, and coverage. We'll also dictate specific versions here because my favorite JSDoc template is a little bit picky about compatibility.

```sh
yarn add -D c8@7.12 foodoc@0.0.9 jasmine@4.4 jasmine-reporters@2.5 jsdoc@3.6 semver@7.3.8 terser@5.15
```

And now for the magic. We'll use some neat [Javascript package tricks](https://dev.to/tythos/give-me-a-json-vasili-one-json-only-please-3kli) I've written about before to include all of our test, documentation, and coverage calls and configuration internally to our `package.json`. For each script (`docs`, `test`, and `cov`), we'll do something similar:

* Extract key values from package specification, including custom blocks of properties, to write out to gitignore'd dot files like `.jsdoc-conf.json`

* Map in shared values where necessary, like package name, before those contents are written out to ensure they are only defined in one place

* Invoke those specific functions against those files and other relevant arguments

In addition to the `scripts` block, that also means we'll be adding a `.jsdoc-conf` block, a `.jasmine-tests` block, a `.jasmine-conf` block, and a `.c8-conf` block. (In the case of `.jasmine-tests`, we're actually writing out the lines of a top-level test module that iterates through our test exports; all the others are just writes of equivalent JSON). Feel free to look at the article linked above, or the source for this project, for an example.

![some sweet, sweet foodoc](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/5lvvpgphm14ddaat55o4.png)

Once that's done, we can run each one and look at the output:

* `yarn run test` will use the dynamically-written runner to invoke each of our test cases and report the results to STDOUT

* `yarn run docs` will generate nicely-formatted JSDoc content in the `out/` folder

* `yarn run cov` will use C8 to trace evaluation of our test suite against the source in our single-file Javascript module and determine how well our tests "cover" our source

![package scripts](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/15ut19ow23xda7bto3b8.png)

## Publishing and Conclusion

Believe it or not, we're ready to publish the package. We may need to set up our `npmjs.com` credentials in an RC file, but once we do, and have finished filling out the "metadata" in your `package.json` (like name, version, dependency, etc.), a simple `yarn publish` command will do the trick. And we're done! Look at that.

![package publishing success](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/7erf6h0fi9hwltlvlyok.png)

Of course, there's a lot more you can do with that, including CI support for automating various stages of our build. But we're at a point now where we're ready to just `yarn add` [this new dependency](https://www.npmjs.com/package/solarplanets) to our solar system application, at which point we have a robust way to compute the realtime position of each planet. Cool beans!
