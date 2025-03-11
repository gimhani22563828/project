require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.EXCHANGE_API_KEY;
const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest`;

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;

    const rate = await getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
};

const getExchangeRate = async (fromCurrency, toCurrency) => {
    try {
        // Corrected the API URL format by adding `fromCurrency` at the end
        const response = await axios.get(`${API_URL}/${fromCurrency}`);
        const rates = response.data.conversion_rates;
        return rates[toCurrency] || 1;  // Default to 1 if the rate is not found
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        throw new Error('Unable to fetch exchange rates');
    }
};

module.exports = { convertCurrency };
