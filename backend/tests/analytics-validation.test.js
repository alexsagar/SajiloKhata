const { validateAnalyticsFilters } = require('../routes/analytics');
// Manual mocks instead of node-mocks-http
const createRequest = () => ({
    query: {},
    analyticsFilters: undefined
});

const createResponse = () => {
    const res = {
        statusCode: 200,
        _data: null,
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            this._data = JSON.stringify(data);
            return this;
        },
        send: function (data) {
            this._data = data;
            return this;
        },
        // Helper for tests
        _getData: function () {
            return this._data;
        }
    };
    return res;
};

describe('Analytics Validation Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = createRequest();
        res = createResponse();
        next = jest.fn();
    });

    test('should accept valid basic filters', () => {
        req.query = { mode: 'all' };
        validateAnalyticsFilters(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.analyticsFilters).toMatchObject({ mode: 'all' });
    });

    test('should accept valid time range filters', () => {
        req.query = { 'time.range': 'THIS_MONTH' };
        validateAnalyticsFilters(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.analyticsFilters.time).toMatchObject({ range: 'THIS_MONTH' });
    });

    test('should accept valid custom time range', () => {
        req.query = {
            'time.range': 'CUSTOM',
            'time.from': '2023-01-01',
            'time.to': '2023-01-31'
        };
        validateAnalyticsFilters(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.analyticsFilters.time).toMatchObject({
            range: 'CUSTOM',
            from: '2023-01-01',
            to: '2023-01-31'
        });
    });

    test('should reject invalid mode', () => {
        req.query = { mode: 'invalid_mode' };
        validateAnalyticsFilters(req, res, next);

        expect(res.statusCode).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.error.message).toContain('Invalid mode');
    });

    test('should reject invalid time range', () => {
        req.query = { 'time.range': 'INVALID_RANGE' };
        validateAnalyticsFilters(req, res, next);

        expect(res.statusCode).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.error.message).toContain('Invalid time.range');
    });

    test('should reject custom range without from/to dates', () => {
        req.query = { 'time.range': 'CUSTOM' };
        validateAnalyticsFilters(req, res, next);

        expect(res.statusCode).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.error.message).toContain('requires both time.from and time.to');
    });

    test('should reject invalid date format', () => {
        req.query = {
            'time.range': 'CUSTOM',
            'time.from': '01-01-2023', // Wrong format
            'time.to': '2023-01-31'
        };
        validateAnalyticsFilters(req, res, next);

        expect(res.statusCode).toBe(400);
    });

    test('should parse array filters from comma-separated strings', () => {
        req.query = {
            categories: 'food,travel',
            status: 'active,settled'
        };
        validateAnalyticsFilters(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.analyticsFilters.categories).toEqual(['food', 'travel']);
        expect(req.analyticsFilters.status).toEqual(['active', 'settled']);
    });

    test('should parse array filters from actual arrays (repeated params)', () => {
        req.query = {
            categories: ['food', 'travel']
        };
        validateAnalyticsFilters(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.analyticsFilters.categories).toEqual(['food', 'travel']);
    });
});
