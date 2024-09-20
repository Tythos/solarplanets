# solarplanets

Implements a self-contained mean-rate (first-order) model of planetary elements, including top-level transform sequence for computing position and velocity state (in a heliocentric ecliptic frame).

Based on Curtis's "Orbital Mechanics for Engineering Students" (though I am using the 2nd edition)--specifically, 8.10 "Planetary Ephemeris":

https://www.sciencedirect.com/book/9780080977478/orbital-mechanics-for-engineering-students

## Quick Start

To use from the command line--e.g., Node:

```js
const solarplanets = await import("./index.mjs");
const planets = JSON.parse(fs.readFileSync("standish_catalog.json", "utf8"));
const dt = new Date();
const [rHcec_km, vHcec_kmps] = solarplanets.getRvFromElementsDatetime(planets.earth, dt);
console.log(rHcec_km);
```

To use from a web application (say, packed with yarn & vite), first add the dependency:

```sh
yarn add solarplanets
```

Then, import from your application:

```js
import * as solarplanets from "./solarplanets.mjs";
fetch("/path/to/standish_catalog.json")
    .then(response => response.json())
    .then(planets => {
        const dt = new Date();
        const [rHcec_km, vHcec_kmps] = solarplanets.getRvFromElementsDatetime(planets.earth, dt);
        console.log(rHcec_km);
    }).catch(console.error);
```

## Behaviors

Includes some degree of self-contained documentation, testing, and coverage behaviors in `package.json` scripts.

The primary entry point is `solarplanets.getRvFromElementsDatetime()`, but all functions are exported from the main module.

Additional meta-behaviors include:

* `yarn run docs`, which will generate (in the `out/` folder) JSDoc auto-documentation from formatted source docstrings

* `yarn run test`, which will use Jasmine to run all unit tests in `tests.mjs` against the primary module

* `yarn run cov` will use C8 to trace the coverage of the unit tests and generate a corresponding report

## Dependencies and Structures

There are no runtime dependencies. Linear algebra routines are self-contained and structures are entirely composed of arrays (for vectors) and arrays-of-arrays (for matrices).

There are a variety of development dependencies to support testing, coverage, documentation, and specific doc templates.

## Reference Table

The file `standish_catalog.json` contains a copy of the planetary orbital elements as copied from page 472 of Curtis's 2nd edition. These are, in turn, a slight transform from the following 1992 paper by Standish et al:

https://www.researchgate.net/publication/232203657_Orbital_Ephemerides_of_the_Sun_Moon_and_Planets

I have reason to believe that some combination of the original values, the transformed values in the text, and the values as used in example problems (which in turn form the basis of unit tests) are not entirely accurate. For example, the results of example 8.7 when computing Earth's position only match the text when the signs of the inclination elements are flipped.

Currently, these reference values are copied into the unit tests to ensure a self-contained test module. The table as a whole, however, is maintained as a module resource so it may be accessed/exposed by downstream software, whether by file or network resource.

## Accuracy

These elements are centered about J2000, and are constituted (for each element) from a linear fit about that point where the independent time variable is in Julian *centuries*.

The Standish paper (above) has a good approximation of tolerances for this table; inner planets should be accurate (for years 1800-2050 AD) less than 100 arc-seconds in heliocentric longitude and latitude, and approximately 10,000km (or substantially less) in distance. Uncertainties for Jupiter and Saturn are substantially larger by an order of magnitude, with the remaining outer planets roughly on order of precision with their inner planet relatives.
