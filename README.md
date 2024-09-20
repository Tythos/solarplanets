# solarplanets

## Reference Table

The file `standish_catalog.json` contains a copy of the planetary orbital elements as copied from page 472 of Curtis's 2nd edition. These are, in turn, a slight transform from the following 1992 paper by Standish et al:

https://www.researchgate.net/publication/232203657_Orbital_Ephemerides_of_the_Sun_Moon_and_Planets

I have reason to believe that some combination of the original values, the transformed values in the text, and the values as used in example problems (which in turn form the basis of unit tests) are not entirely accurate. For example, the results of example 8.7 when computing Earth's position only match the text when the signs of the inclination elements are flipped.

Currently, these reference values are copied into the unit tests to ensure a self-contained test module. The table as a whole, however, is maintained as a module resource so it may be accessed/exposed by downstream software, whether by file or network resource.

## Accuracy

These elements are centered about J2000, and are constituted (for each element) from a linear fit about that point where the independent time variable is in Julian *centuries*.

The Standish paper (above) has a good approximation of tolerances for this table; inner planets should be accurate (for years 1800-2050 AD) less than 100 arc-seconds in heliocentric longitude and latitude, and approximately 10,000km (or substantially less) in distance. Uncertainties for Jupiter and Saturn are substantially larger by an order of magnitude, with the remaining outer planets roughly on order of precision with their inner planet relatives.
