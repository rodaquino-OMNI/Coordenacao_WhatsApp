const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const apiCanaryBlueprint = async function () {
    // Configure request options
    const requestOptions = {
        hostname: '${endpoint_url}',
        method: 'GET',
        path: '/health',
        port: 443,
        protocol: 'https:',
        timeout: 10000
    };
    
    // Set request headers
    const headers = {
        'User-Agent': synthetics.getCanaryUserAgentString(),
        'Accept': 'application/json'
    };
    
    requestOptions['headers'] = headers;
    
    // Make health check request
    const response = await synthetics.executeHttpStep(
        'Health Check',
        requestOptions,
        (res) => {
            return new Promise((resolve, reject) => {
                if (res.statusCode !== 200) {
                    reject(`Health check failed with status code: ${res.statusCode}`);
                }
                
                let responseBody = '';
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const parsedBody = JSON.parse(responseBody);
                        if (parsedBody.status === 'healthy') {
                            resolve();
                        } else {
                            reject(`Health check returned unhealthy status: ${parsedBody.status}`);
                        }
                    } catch (error) {
                        reject(`Failed to parse response: ${error.message}`);
                    }
                });
            });
        }
    );
    
    return response;
};

exports.handler = async () => {
    return await synthetics.getCanary().executeStep('Health Check', apiCanaryBlueprint);
};