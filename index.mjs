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
function INT(f) {
    return Math.floor(f);
}

/**
 * Implements Eq. 5.48 to compute julian date number from given ymd values
 * 
 * @param {Number} y - Year
 * @param {Number} m - Month
 * @param {Number} d - Day
 * @returns {Number} - Julian date number for given ymd date
 */
function getJ0FromDatevec(y, m, d) {
    return 367 * y - INT(7 * (y + INT((m + 9) / 12)) / 4) + INT(275 * m / 9) + d + 1721013.5;
}

/**
 * Implements Eq. 5.47 to compute the julian date value from a JD number and universal time.
 * 
 * @param {Number} J0 - Julian date number (as might be returned by getJ0FromDatevec)
 * @param {Number} UT - Universal time [fractional hours]
 * @returns {Number} - Julian date value
 */
function getJdFromDateTime(J0, UT) {
    return J0 + UT / 24;
}

/**
 * Computes the number of Julian centories that have passed since the given julian date value.
 * 
 * @param {Number} JD - Julian date value
 * @returns {Number} - Julian centuries
 */
function getJulianCenturies(JD) {
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
function getCurrentElements(Q0, dQ, T0) {
    return Q0 + dQ * T0;
}

/**
 * Computes angular momentum (scalar) given shape of solar orbit (e.g., semi-major axis and eccentricity).
 * 
 * @param {Number} a_km - Semi-major axis [km]
 * @param {Number} e - Eccentricity
 * @returns {Number} - Angular momentum (km^2/s)
 */
function getAngularMomentum(a_km, e) {
    return Math.sqrt(MU_SUN_KM3PS2 * a_km * (1 - e * e));
}

/**
 * Computes argument of periapsis from longitude of perihelion and right-ascension of ascending node.
 * 
 * @param {Number} lop_rad - Longitude of perihelion [rad]
 * @param {Number} raan_rad - Right-ascension of ascending node [rad]
 * @returns {Number} - Argument of periapsis [rad]
 */
function getAopFromLopRaan(lop_rad, raan_rad) {
    return (lop_rad - raan_rad) % (2 * Math.PI);
}

/**
 * Computes mean anomaly from mean longitude and longitude of perihelion
 * 
 * @param {Number} ml_rad - Mean longitude [rad]
 * @param {Number} lop_rad - Longitude of perihelion [rad]
 * @returns {Number} - Mean anomly [rad]
 */
function getMaFromMlLop(ml_rad, lop_rad) {
    return (ml_rad - lop_rad) % (2 * Math.PI);
}

/**
 * Computes eccentric anomaly from mean anomaly and eccentricity. This implements equation Eq. 3.14, solving Kepler's equation numerically via Alg. 3.1.
 * 
 * @param {Number} M_rad - Mean anomly [rad]
 * @param {Number} e - Eccentricity
 * @returns {Number} - Eccentric anomaly [rad]
 */
function getEaFromMaE(M_rad, e) {
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
function getTaFromEaE(E_rad, e) {
    return Math.atan2(Math.tan(0.5 * E_rad) * Math.sqrt(1 + e), Math.sqrt(1 - e));
}

/**
 * Computes position in perifocal (PQW) frame given angular momentum, eccentricity, and true anomaly.
 * 
 * @param {Number} h_km2ps - Angular momentum scalar [km^2/s]
 * @param {Number} e - Eccentricity
 * @param {Number} tht_rad - True anomaly [rad]
 * @returns {Array} - Position in PQR frame [km]
 */
function getRpqwFromHETht(h_km2ps, e, tht_rad) {
    const c = h_km2ps * h_km2ps / (MU_SUN_KM3PS2 * (1 + e * Math.cos(tht_rad)));
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
function getVpqwFromHETht(h_km2ps, e, tht_rad) {
    const c = MU_SUN_KM3PS2 / h_km2ps;
    return [
        c * -Math.sin(tht_rad),
        c * (e + Math.cos(tht_rad)),
        0
    ];
}

/**
 * Computes a matrix for frame transformation (not vector rotation) about the x axis by the given angle.
 * 
 * @param {Number} rad - Angle about the x axis [rad]
 * @returns {Array} - Frame transformation as a 3x3 matrix (e.g., array of arrays)
 */
function R1(rad) {
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
function R3(rad) {
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
function getDotProd(lhs, rhs) {
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
function getMatVec(lhs, rhs) {
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
function getMatMul(lhs, rhs) {
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
 * Computes frame transformation for converting vectors from perifocal (PQW) to inertial (~ECI) coordinates.
 * 
 * Note that technically "ECI" is earth-centric but we use it here (within the context of solar system frames) as a standin for an inertial frame name. The transformation implementation is identical.
 * 
 * @param {Number} raan_rad - Right ascension of ascending node [rad]
 * @param {Number} inc_rad - Inclination [rad]
 * @param {Number} aop_rad - Argument of periapsis [rad]
 * @returns {Array} - Frame transformation as 3x3 matrix (e.g., array-of-arrays)
 */
function getQpqw2eci(raan_rad, inc_rad, aop_rad) {
    return getMatMul(R3(raan_rad), getMatMul(R1(inc_rad), R3(aop_rad)));
}

/**
 * Computes the position and velocity of a given planetary model as evaluated at the given datetime.
 * 
 * @param {Object} planetaryOrbitalElements - Planetary orbital elements model, including mean (offset and rate) coefficients
 * @param {Date} dt - Datetime at which state will be evaluated
 * @returns {Array} - Two-element array containing r and v as evaluated in solar system inertial space. Each element is a three-element array of numeric values in [km] and [km/s], respectively.
 */
function getRvFromElementsDatetime(planetaryOrbitalElements, dt) {
    const a_au = getCurrentElements(planetaryOrbitalElements.a_au, planetaryOrbitalElements.da_au, T0);
    const e = getCurrentElements(planetaryOrbitalElements.e, planetaryOrbitalElements.de, T0);
    const inc_rad = getCurrentElements(planetaryOrbitalElements.inc_rad, planetaryOrbitalElements.dinc_rad, T0);
    const raan_rad = getCurrentElements(planetaryOrbitalElements.a, planetaryOrbitalElements.da, T0);
    const lop_rad = getCurrentElements(planetaryOrbitalElements.a, planetaryOrbitalElements.da, T0);
    const ml_rad = getCurrentElements(planetaryOrbitalElements.a, planetaryOrbitalElements.da, T0);

    const Qpqw2eci = getQpqw2eci()
    const rEci_km = getMatVec(Qpqw2eci, rPqw_km);
    const vEci_kmps = getMatVec(Qpqw2eci, vPqw_kmps);
    return [
        rEci_km,
        vEci_kmps
    ];
}

export default Object.assign({
    getRvFromElementsDatetime,
}, {
    "__tests__": {
        "can be tested": () => {
            expect(true).toEqual(true);
        }
    }
});
