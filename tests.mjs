/**
 * tests.mjs
 */

import * as solarplanets from "./index.mjs";

export default {
    "can be tested": () => {
        expect(true).toEqual(true);
    },

    "can reproduce example 5.4 UT": () => {
        expect(solarplanets.getUtFromTimevec(14, 45, 30)).toBeCloseTo(14.758, 1e-3);
    },

    "can round positive integers": () => {
        expect(solarplanets.INT(1.2)).toEqual(1.0);
    },

    "can round negative integers": () => {
        expect(solarplanets.INT(-3.4)).toEqual(-3.0);
    },

    "can positive modulo": () => {
        expect(solarplanets.posmod(-0.5 * Math.PI, 2 * Math.PI)).toBeCloseTo(1.5 * Math.PI, 1e-3);
    },

    "can reproduce example 5.4 J0": () => {
        expect(solarplanets.getJ0FromDatevec(2004, 5, 12)).toEqual(2453137.5);
    },

    "can reproduce example 5.5 J0": () => {
        expect(solarplanets.getJ0FromDatevec(1957, 10, 4)).toEqual(2436115.5);
    },

    "can reproduce example 8.7 J0": () => {
        expect(solarplanets.getJ0FromDatevec(2003, 8, 27)).toEqual(2452878.5);
    },

    "can reproduce example 5.4 JD": () => {
        const J0 = solarplanets.getJ0FromDatevec(2004, 5, 12);
        const UT = solarplanets.getUtFromTimevec(14, 45, 30);
        expect(solarplanets.getJdFromDateTime(J0, UT)).toBeCloseTo(2453138.115, 1e-3);
    },

    "can reproduce example 5.5 JD": () => {
        const J0 = solarplanets.getJ0FromDatevec(1957, 10, 4);
        const UT = solarplanets.getUtFromTimevec(19, 26, 24);
        expect(solarplanets.getJdFromDateTime(J0, UT)).toBeCloseTo(2436116.31, 1e-3);
    },

    "can reproduce example 5.6 T0": () => {
        const J0 = solarplanets.getJ0FromDatevec(2004, 3, 3);
        const UT = solarplanets.getUtFromTimevec(4, 30, 0);
        const JD = solarplanets.getJdFromDateTime(J0, UT);
        expect(solarplanets.getJulianCenturies(JD)).toBeCloseTo(0.041683778, 1e-3);
    },

    "can interpolate elements": () => {
        // we evaluate interpolation of e of earth and mars from example 8.7
        const T0 = 0.036523;
        expect(solarplanets.getCurrentElements(0.01671022, -0.00003804, T0)).toBeCloseTo(0.016709, 1e-3);
        expect(solarplanets.getCurrentElements(0.09341233, 0.00011902, T0)).toBeCloseTo(0.093417, 1e-3);
    },

    "can compute angular momentum": () => {
        // we borrow this case from part (b) of example 2.7
        const actual = solarplanets.getAngularMomentum(8578, 0.2098, 398600);
        const expected = 57172;
        expect(Math.abs(actual - expected) / expected).toBeLessThan(1e-3);
    },

    "can compute planetary argument of periapsis": () => {
        // we borrow this case from part of example 8.7 for both earth and mars
        const d2r = Math.PI / 180;
        expect(solarplanets.getAopFromLopRaan(102.96 * d2r, 348.55 * d2r)).toBeCloseTo(114.1 * d2r, 1e-3);
        expect(solarplanets.getAopFromLopRaan(336.06 * d2r, 49.568 * d2r)).toBeCloseTo(286.49 * d2r, 1e-3);
    },

    "can compute planetary mean anomaly": () => {
        // we borrow this case from part of example 8.7 for both earth and mars
        const d2r = Math.PI / 180;
        expect(solarplanets.getMaFromMlLop(335.27 * d2r, 102.96 * d2r)).toBeCloseTo(232.31 * d2r, 1e-3);
        expect(solarplanets.getMaFromMlLop(334.51 * d2r, 336.06 * d2r)).toBeCloseTo(358.45 * d2r, 1e-3);
    },

    "can solve kepler's equation from example 8.7": () => {
        const d2r = Math.PI / 180;
        expect(solarplanets.getEaFromMaE(232.31 * d2r, 0.016709)).toBeCloseTo(231.56 * d2r, 1e-3);
        expect(solarplanets.getEaFromMaE(358.45 * d2r, 0.093417)).toBeCloseTo(358.03 * d2r, 1e-3);
    },

    "can solve kepler's equation from example 3.1": () => {
        // technically, this *inverts* example 3.1
        expect(solarplanets.getEaFromMaE(1.3601, 0.37255)).toBeCloseTo(1.7281);
    },

    "can solve kepler's equation from example 3.2": () => {
        expect(solarplanets.getEaFromMaE(3.6029, 0.37255)).toBeCloseTo(3.4794, 1e-3);
    },

    "can get true anomaly from example 8.7": () => {
        const d2r = Math.PI / 180;
        expect(solarplanets.getTaFromEaE(231.56 * d2r, 0.016709)).toBeCloseTo(230.81 * d2r, 1e-3);
        expect(solarplanets.getTaFromEaE(358.30 * d2r, 0.093417)).toBeCloseTo(358.13 * d2r, 1e-3);
    },

    "can get true anomaly from example 3.2": () => {
        const d2r = Math.PI / 180;
        expect(solarplanets.getTaFromEaE(3.4794, 0.37255)).toBeCloseTo(193.2 * d2r, 1e-3);
    },

    "can get perifocal position from example 4.7": () => {
        const d2r = Math.PI / 180;
        const actual = solarplanets.getRpqwFromHETht(80000, 1.4, 30 * d2r, 398600);
        const expected = [6285.0, 3628.6, 0];
        for (let i = 0; i < 3; i += 1) {
            expect(actual[i]).toBeCloseTo(expected[i], 1e-3);
        }
    },

    "can get perifocal velocity from example 4.7": () => {
        const d2r = Math.PI / 180;
        const actual = solarplanets.getVpqwFromHETht(80000, 1.4, 30 * d2r, 398600);
        const expected = [-2.4913, 11.290, 0];
        for (let i = 0; i < 3; i += 1) {
            expect(actual[i]).toBeCloseTo(expected[i], 1e-3);
        }
    },

    "can rotate vector about x": () => {
        const actual = solarplanets.getMatVec(solarplanets.r1(0.5 * Math.PI), [0, 1, 0]);
        const expected = [0, 0, 1];
        for (let i = 0; i < 3; i += 1) {
            expect(actual[i]).toBeCloseTo(expected[i], 1e-3);
        }
    },

    "can get frame transformation about x": () => {
        const actual = solarplanets.R1(0.5 * Math.PI);
        const expected = [
            [1, 0, 0],
            [0, 0, 1],
            [0, -1, 0]
        ];
        for (let i = 0; i < 3; i += 1) {
            for (let j = 0; j < 3; j += 1) {
                expect(actual[i][j]).toBeCloseTo(expected[i][j], 1e-3);
            }
        }
    },

    "can rotate vector about z": () => {
        const actual = solarplanets.getMatVec(solarplanets.r3(0.5 * Math.PI), [1, 0, 0]);
        const expected = [0, 1, 0];
        for (let i = 0; i < 3; i += 1) {
            expect(actual[i]).toBeCloseTo(expected[i], 1e-3);
        }
    },

    "can get frame transformation about z": () => {
        const actual = solarplanets.R3(0.5 * Math.PI);
        const expected = [
            [0, 1, 0],
            [-1, 0, 0],
            [0, 0, 1]
        ];
        for (let i = 0; i < 3; i += 1) {
            for (let j = 0; j < 3; j += 1) {
                expect(actual[i][j]).toBeCloseTo(expected[i][j], 1e-3);
            }
        }
    },

    "can compute a dot product": () => {
        expect(solarplanets.getDotProd([1, 2, 3], [4, -5, 6])).toBeCloseTo(12);
    },

    "can multiply a matrix by a vector": () => {
        const actual = solarplanets.getMatVec([
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ], [
            1,
            0,
            -1
        ]);
        const expected = [
            -2,
            -2,
            -2
        ];
        for (let i = 0; i < 3; i += 1) {
            expect(actual[i]).toBeCloseTo(expected[i], 1e-3);
        }
    },

    "can multiply a matrix by a matrix": () => {
        const actual = solarplanets.getMatMul([
            [1, 0, 2],
            [0, 3, 0],
            [4, 0, 5]
        ], [
            [0, 6, 0],
            [7, 0, 8],
            [0, 9, 0]
        ]);
        const expected = [
            [0, 24, 0],
            [21, 0, 24],
            [0, 69, 0]
        ];
        for (let i = 0; i < 3; i += 1) {
            for (let j = 0; j < 3; j += 1) {
                expect(actual[i][j]).toBeCloseTo(expected[i][j], 1e-3);
            }
        }
    },

    "can compute eci-to-pqr transform from example 4.7": () => {
        const d2r = Math.PI / 180;
        const actual = solarplanets.getQeci2pqw(40 * d2r, 30 * d2r, 60 * d2r);
        const expected = [
            [-0.099068, 0.89593, 0.43301],
            [-0.94175, -0.22496, 0.25],
            [0.32139, -0.38302, 0.86603]
        ];
        for (let i = 0; i < 3; i += 1) {
            for (let j = 0; j < 3; j += 1) {
                expect(actual[i][j]).toBeCloseTo(expected[i][j], 1e-3);
            }
        }
    },

    "can transpose a non-square matrix": () => {
        const actual = solarplanets.transpose([
            [1, 2, 3],
            [4, 5, 6]
        ]);
        const expected = [
            [1, 4],
            [2, 5],
            [3, 6]
        ];
        expect(actual.length).toEqual(3);
        expect(actual[0].length).toEqual(2);
        for (let i = 0; i < 3; i += 1) {
            for (let j = 0; j < 2; j += 1) {
                expect(actual[i][j]).toBeCloseTo(expected[i][j], 1e-3);
            }
        }
    },

    "can compute pqr-to-eci transform from example 4.7": () => {
        const d2r = Math.PI / 180;
        const actual = solarplanets.getQpqw2eci(40 * d2r, 30 * d2r, 60 * d2r);
        const expected = [
            [-0.099068, -0.94175, 0.32139],
            [0.89593, -0.22496, -0.38302],
            [0.43301, 0.25, 0.86603]
        ];
        for (let i = 0; i < 3; i += 1) {
            for (let j = 0; j < 3; j += 1) {
                expect(actual[i][j]).toBeCloseTo(expected[i][j], 1e-3);
            }
        }
    },

    "can replicate exercise 8.7 end-to-end for earth": () => {
        // copy elements for purposes of having a self-contained test
        const earth = {
            "a_au": 1.00000011,
            "da_au": -0.00000005,
            "e": 0.01671022,
            "de": -0.00003804,
            "inc_deg": -0.00005,
            "dinc_sec": 46.94,
            "raan_deg": -11.26064,
            "draan_sec": -18228.25,
            "lop_deg": 102.94719,
            "dlop_sec": 1198.28,
            "ml_deg": 100.46435,
            "dml_sec": 129597740.63
        };
        const dt = new Date(Date.UTC(2003, 8 - 1, 27, 12, 0, 0)); // note adjustment for "month index" (thanks, Javascript)
        const [rActualHcec_km, vActualHcec_kmps] = solarplanets.getRvFromElementsDatetime(earth, dt);
        const rExpectedHcec_km = [135.59, -66.803, -0.00028691].map(v => v * 1e6);
        const vExpectedHcec_kmps = [12.680, 26.61, -0.00021273];
        for (let i = 0; i < 3; i += 1) {
            const dr_rel = (rActualHcec_km[i] - rExpectedHcec_km[i]) / rExpectedHcec_km[i];
            const dv_rel = (vActualHcec_kmps[i] - vExpectedHcec_kmps[i]) / vExpectedHcec_kmps[i];
            expect(dr_rel).toBeLessThan(1e-3);
            expect(dv_rel).toBeLessThan(1e-3);
        }
    },

    "can replicate exercise 8.7 end-to-end for mars": () => {
        const mars = {
            "a_au": 1.52366231,
            "da_au": -0.00007221,
            "e": 0.09341233,
            "de": 0.00011902,
            "inc_deg": 1.85061,
            "dinc_sec": -25.47,
            "raan_deg": 49.57854,
            "draan_sec": -1020.19,
            "lop_deg": 336.04084,
            "dlop_sec": 1560.78,
            "ml_deg": 355.45332,
            "dml_sec": 68905103.78
        };
        const dt = new Date(Date.UTC(2003, 8 - 1, 27, 12, 0, 0)); // note adjustment for "month index" (thanks, Javascript)
        const [rActualHcec_km, vActualHcec_kmps] = solarplanets.getRvFromElementsDatetime(mars, dt);
        const rExpectedHcec_km = [185.95, -89.916, -6.4566].map(v => v * 1e6);
        const vExpectedHcec_kmps = [11.474, 23.884, 0.21826];
        for (let i = 0; i < 3; i += 1) {
            const dr_rel = (rActualHcec_km[i] - rExpectedHcec_km[i]) / rExpectedHcec_km[i];
            const dv_rel = (vActualHcec_kmps[i] - vExpectedHcec_kmps[i]) / vExpectedHcec_kmps[i];
            expect(dr_rel).toBeLessThan(1e-3);
            expect(dv_rel).toBeLessThan(1e-3);
        }
    }
};
