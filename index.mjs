/**
 * @author <code@tythos.net>
 */

const MU_SUN_KM3PS2 = 1.327e11;

/**
 * Returns integer fraction of given floating point value.
 * 
 * @param {Number} f - Floating-point value
 * @returns {Number} - Integer portion of floating-point value
 */
export function INT(f) {
    return f < 0 ? Math.floor(f + 1.0) : Math.floor(f);
}

/**
 * Computes the universal time hours fraction--e.g., decimal value within [0,24)--from given hms values.
 * 
 * @param {Number} h - Hours integer, within [0-24)
 * @param {Number} m - Minutes integer, within [0-60)
 * @param {Number} s - Seconds decimal, within [0-60)
 * @returns {Number} - Hours fraction for UT calculations
 */
export function getUtFromTimevec(h, m, s) {
    return h + m / 60 + s / 3600;
}

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

/**
 * Implements Eq. 5.48 to compute julian date number from given ymd values
 * 
 * @param {Number} y - Year
 * @param {Number} m - Month
 * @param {Number} d - Day
 * @returns {Number} - Julian date number for given ymd date
 */
export function getJ0FromDatevec(y, m, d) {
    return 367 * y - INT(7 * (y + INT((m + 9) / 12)) / 4) + INT(275 * m / 9) + d + 1721013.5;
}

/**
 * Implements Eq. 5.47 to compute the julian date value from a JD number and universal time.
 * 
 * @param {Number} J0 - Julian date number (as might be returned by getJ0FromDatevec)
 * @param {Number} UT - Universal time [fractional hours]
 * @returns {Number} - Julian date value
 */
export function getJdFromDateTime(J0, UT) {
    return J0 + UT / 24;
}

/**
 * Computes the number of Julian centories that have passed since the given julian date value.
 * 
 * @param {Number} JD - Julian date value
 * @returns {Number} - Julian centuries
 */
export function getJulianCenturies(JD) {
    return (JD - 2451545) / 36525;
}

/**
 * Computes the "current" element from a linear approximation from an epoch and the current time.
 * 
 * @param {Number} Q0 - Constant term of linear approximation
 * @param {Number} dQ - Linear rate term of approximation
 * @param {Number} T0 - Number of julian centuries from epoch
 * @returns {Number} - Linear approximation of given element
 */
export function getCurrentElements(Q0, dQ, T0) {
    return Q0 + dQ * T0;
}

/**
 * Computes angular momentum (scalar) given shape of solar orbit (e.g., semi-major axis and eccentricity).
 * 
 * @param {Number} a_km - Semi-major axis [km]
 * @param {Number} e - Eccentricity
 * @returns {Number} - Angular momentum (km^2/s)
 */
export function getAngularMomentum(a_km, e, mu_km3ps2 = MU_SUN_KM3PS2) {
    return Math.sqrt(mu_km3ps2 * a_km * (1 - e * e));
}

/**
 * Computes argument of periapsis from longitude of perihelion and right-ascension of ascending node.
 * 
 * @param {Number} lop_rad - Longitude of perihelion [rad]
 * @param {Number} raan_rad - Right-ascension of ascending node [rad]
 * @returns {Number} - Argument of periapsis [rad]
 */
export function getAopFromLopRaan(lop_rad, raan_rad) {
    return posmod(lop_rad - raan_rad, 2 * Math.PI);
}

/**
 * Computes mean anomaly from mean longitude and longitude of perihelion
 * 
 * @param {Number} ml_rad - Mean longitude [rad]
 * @param {Number} lop_rad - Longitude of perihelion [rad]
 * @returns {Number} - Mean anomly [rad]
 */
export function getMaFromMlLop(ml_rad, lop_rad) {
    return posmod(ml_rad - lop_rad, 2 * Math.PI);
}

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

/**
 * Computes true anomaly from eccentric anomaly and eccentricity.
 * 
 * @param {Number} E_rad - Eccentric anomaly [rad]
 * @param {Number} e - Eccentricity
 * @returns {Number} - True anomaly [rad]
 */
export function getTaFromEaE(E_rad, e) {
    const ta_rad = 2.0 * Math.atan2(Math.tan(0.5 * E_rad) * Math.sqrt(1 + e), Math.sqrt(1 - e));
    return posmod(ta_rad, 2 * Math.PI);
}

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

/**
 * Computes velocity in perifocal (PQR) frame given angular momentum, eccentricity, and true anomaly.
 * 
 * @param {Number} h_km2ps - Angular momentum scalar [km^2/s]
 * @param {Number} e - Eccentricity
 * @param {Number} tht_rad - True anomaly [rad]
 * @returns {Array} - Velocity in PQR frame [km/s]
 */
export function getVpqwFromHETht(h_km2ps, e, tht_rad, mu_km3ps2 = MU_SUN_KM3PS2) {
    const c = mu_km3ps2 / h_km2ps;
    return [
        c * -Math.sin(tht_rad),
        c * (e + Math.cos(tht_rad)),
        0
    ];
}

/**
 * Computes a matrix for vector rotation (not frame transformation) about the x axis by the given angle.
 * 
 * @param {Number} rad - Angle about the x axis [rad]
 * @returns {Array} - Frame transformation as a 3x3 matrix (e.g., array of arrays)
 */
export function r1(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        [1, 0, 0],
        [0, c, -s],
        [0, s, c]
    ];
}

/**
 * Computes a matrix for vector rotation (not frame transformation) about the z axis by the given angle.
 * 
 * @param {Number} rad - Angle about the z axis [rad]
 * @returns {Array} - Frame transformation as a 3x3 matrix (e.g., array of arrays)
 */
export function r3(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        [c, -s, 0],
        [s, c, 0],
        [0, 0, 1]
    ];
}

/**
 * Computes a matrix for frame transformation (not vector rotation) about the x axis by the given angle.
 * 
 * @param {Number} rad - Angle about the x axis [rad]
 * @returns {Array} - Frame transformation as a 3x3 matrix (e.g., array of arrays)
 */
export function R1(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        [1, 0, 0],
        [0, c, s],
        [0, -s, c]
    ];
}

/**
 * Computes a matrix for frame transformation (not vector rotation) about the z axis by the given angle.
 * 
 * @param {Number} rad - Angle about the z axis [rad]
 * @returns {Array} - Frame transformation as a 3x3 matrix (e.g., array of arrays)
 */
export function R3(rad) {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
        [c, s, 0],
        [-s, c, 0],
        [0, 0, 1]
    ];
}

/**
 * Computes dot product of two vectors with identical lengths.
 * 
 * @param {Array} lhs - Vector of fixed length
 * @param {Array} rhs - Vector of same fixed length
 * @returns {Number} - Dot product of two vectors
 */
export function getDotProd(lhs, rhs) {
    let sum = 0;
    for (let i = 0; i < lhs.length; i += 1) {
        sum += lhs[i] * rhs[i];
    }
    return sum;
}

/**
 * Matrix-vector multiplication
 * 
 * @param {Array} lhs - 3x3 matrix as an array-of-arrays
 * @param {Array} rhs - 3d vector
 * @returns {Array} - Vector product of lhs * rhs
 */
export function getMatVec(lhs, rhs) {
    const r1 = [lhs[0][0], lhs[0][1], lhs[0][2]];
    const r2 = [lhs[1][0], lhs[1][1], lhs[1][2]];
    const r3 = [lhs[2][0], lhs[2][1], lhs[2][2]];
    return [
        getDotProd(r1, rhs),
        getDotProd(r2, rhs),
        getDotProd(r3, rhs)
    ];
}

/**
 * Computes product of matrix multiplication
 * 
 * @param {Array} lhs - 3x3 matrix as array-of-arrays
 * @param {Array} rhs - 3x3 matrix as array-of-arrays
 * @returns {Array} - Product of matrix multiplication (3x3 matrix as array-of-arrays)
 */
export function getMatMul(lhs, rhs) {
    const r1 = [lhs[0][0], lhs[0][1], lhs[0][2]];
    const r2 = [lhs[1][0], lhs[1][1], lhs[1][2]];
    const r3 = [lhs[2][0], lhs[2][1], lhs[2][2]];
    const c1 = [rhs[0][0], rhs[1][0], rhs[2][0]];
    const c2 = [rhs[0][1], rhs[1][1], rhs[2][1]];
    const c3 = [rhs[0][2], rhs[1][2], rhs[2][2]];
    return [
        [getDotProd(r1, c1), getDotProd(r1, c2), getDotProd(r1, c3)],
        [getDotProd(r2, c1), getDotProd(r2, c2), getDotProd(r2, c3)],
        [getDotProd(r3, c1), getDotProd(r3, c2), getDotProd(r3, c3)]
    ];
}

/**
 * Computes frame transformation for converting vectors from inertial (~ECI) to perifocal (PQW) coordinates.
 * 
 * Note that technically "ECI" is earth-centric but we use it here (within the context of solar system frames) as a standin for an inertial frame name. The transformation implementation is identical.
 * 
 * @param {Number} raan_rad - Right-ascension of ascending node [rad]
 * @param {Number} inc_rad - Inclination [rad]
 * @param {Number} aop_rad - Argument of periapsis [rad]
 * @returns {Array} - 3x3 matrix as array-of-arrays
 */
export function getQeci2pqw(raan_rad, inc_rad, aop_rad) {
    const R31 = getMatMul(R3(aop_rad), R1(inc_rad));
    return getMatMul(R31, R3(raan_rad));
}

/**
 * Returns the transpose of the given matrix. Must be a 2d matrix but does not have to be 3x3 or necessarily square.
 * 
 * @param {Array} M - MxN matrix as array-of-arrays
 * @returns {Array} - NxM matrix as array-of-arrays
 */
export function transpose(M) {
    const I = M.length;
    const J = M[0].length;
    const Mt = new Array(J).fill(null).map(_ => new Array(I).fill(0));
    for (let i = 0; i < I; i += 1) {
        for (let j = 0; j < J; j += 1) {
            Mt[j][i] = M[i][j];
        }
    }
    return Mt;
}

/**
 * Computes frame transformation for converting vectors from perifocal (PQW) to inertial (~ECI) coordinates.
 * 
 * Note that technically "ECI" is earth-centric but we use it here (within the context of solar system frames) as a standin for an inertial frame name. The transformation implementation is identical.
 * 
 * @param {Number} raan_rad - Right ascension of ascending node [rad]
 * @param {Number} inc_rad - Inclination [rad]
 * @param {Number} aop_rad - Argument of periapsis [rad]
 * @returns {Array} - Frame transformation as 3x3 matrix (e.g., array-of-arrays)
 */
export function getQpqw2eci(raan_rad, inc_rad, aop_rad) {
    const Qeci2pqw = getQeci2pqw(raan_rad, inc_rad, aop_rad);
    return transpose(Qeci2pqw);
}

/**
 * Computes the position and velocity of a given planetary model as evaluated at the given datetime. Results are returned in a "sun-centered inertial", which is defined in the heliocentric ecliptic frame of reference.
 * 
 * @param {Object} planetaryOrbitalElements - Planetary orbital elements model, including mean (offset and rate) coefficients
 * @param {Date} dt - Datetime at which state will be evaluated
 * @returns {Array} - Two-element array containing r and v as evaluated in the heliocentric ecliptic frame; each element is a three-element array of numeric values in [km] and [km/s], respectively
 */
export function getRvFromElementsDatetime(planetaryOrbitalElements, dt) {
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
    //console.log(J0, UT, T0);

    // interpolate (and convert) planetary elements
    const d2r = Math.PI / 180;
    const au2km = 1.49597871e8;
    const a_km = getCurrentElements(planetaryOrbitalElements.a_au * au2km, planetaryOrbitalElements.da_au * au2km, T0);
    const e = getCurrentElements(planetaryOrbitalElements.e, planetaryOrbitalElements.de, T0);
    const inc_rad = posmod(getCurrentElements(planetaryOrbitalElements.inc_deg * d2r, planetaryOrbitalElements.dinc_sec / 3600 * d2r, T0), 2 * Math.PI);
    const raan_rad = posmod(getCurrentElements(planetaryOrbitalElements.raan_deg * d2r, planetaryOrbitalElements.draan_sec / 3600 * d2r, T0), 2 * Math.PI);
    const lop_rad = posmod(getCurrentElements(planetaryOrbitalElements.lop_deg * d2r, planetaryOrbitalElements.dlop_sec / 3600 * d2r, T0), 2 * Math.PI);
    const ml_rad = posmod(getCurrentElements(planetaryOrbitalElements.ml_deg * d2r, planetaryOrbitalElements.dml_sec / 3600 * d2r, T0), 2 * Math.PI);
    //console.log(a_km, e, inc_rad / d2r, raan_rad / d2r, lop_rad / d2r, ml_rad / d2r);

    // compute angular momentum, argument of periapsis, and mean anomaly from elements
    const h_km2ps = getAngularMomentum(a_km, e);
    const aop_rad = getAopFromLopRaan(lop_rad, raan_rad);
    const M_rad = getMaFromMlLop(ml_rad, lop_rad);
    //console.log(h_km2ps, aop_rad / d2r, M_rad / d2r);

    // solve kepler's equation for true anomaly
    const E_rad = getEaFromMaE(M_rad, e);
    const tht_rad = getTaFromEaE(E_rad, e);
    //console.log(E_rad / d2r, tht_rad / d2r);

    // compute perifocal states
    const rPqw_km = getRpqwFromHETht(h_km2ps, e, tht_rad);
    const vPqw_kmps = getVpqwFromHETht(h_km2ps, e, tht_rad);
    //console.log(rPqw_km, vPqw_kmps);

    // convert to inertial states and return
    const Qpqw2eci = getQpqw2eci(raan_rad, inc_rad, aop_rad);
    const rHcec_km = getMatVec(Qpqw2eci, rPqw_km);
    const vHcec_kmps = getMatVec(Qpqw2eci, vPqw_kmps);
    //console.log(Qpqw2eci, rHcec_km, vHcec_kmps);
    return [
        rHcec_km,
        vHcec_kmps
    ];
}
