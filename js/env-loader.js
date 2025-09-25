/**
 * Environment Variables Loader for Wolf Control
 * Loads environment variables from .env file for client-side use
 * 
 * SECURITY NOTE: This is for client-side environment variables only.
 * Never expose sensitive server-side secrets through this method.
 */

class EnvironmentLoader {
    constructor() {
        this.env = {};
        this.loaded = false;
    }

    /**
     * Load environment variables from .env file
     */
    async loadEnvironment() {
        if (this.loaded) {
            return this.env;
        }

        try {
            // Try to load from .env file
            const response = await fetch('./.env');
            
            if (response.ok) {
                const envContent = await response.text();
                this.parseEnvContent(envContent);
            } else {
                console.warn('Could not load .env file, using fallback values');
                this.loadFallbackValues();
            }
        } catch (error) {
            console.warn('Error loading environment variables:', error);
            this.loadFallbackValues();
        }

        this.loaded = true;
        
        // Make environment variables globally available
        window.ENV = this.env;
        
        return this.env;
    }

    /**
     * Parse .env file content
     */
    parseEnvContent(content) {
        const lines = content.split('\n');
        
        for (const line of lines) {
            // Skip empty lines and comments
            if (!line.trim() || line.trim().startsWith('#')) {
                continue;
            }

            // Parse key=value pairs
            const equalIndex = line.indexOf('=');
            if (equalIndex > 0) {
                const key = line.substring(0, equalIndex).trim();
                const value = line.substring(equalIndex + 1).trim();
                
                // Remove quotes if present
                this.env[key] = value.replace(/^["']|["']$/g, '');
            }
        }
    }

    /**
     * Load fallback values when .env file is not available
     */
    loadFallbackValues() {
        // These are safe fallback values - no sensitive data
        this.env = {
            APP_NAME: 'Wolf Control',
            APP_VERSION: '1.0.0',
            APP_ENVIRONMENT: 'production',
            SESSION_TIMEOUT: '3600000',
            MAX_LOGIN_ATTEMPTS: '5',
            LOG_LEVEL: 'info',
            CACHE_ENABLED: 'true',
            CACHE_DURATION: '300000',
            // Sensitive values should be empty in fallback
            SUPABASE_URL: '',
            SUPABASE_ANON_KEY: '',
            ADMIN_EMAIL: '',
            ADMIN_PASSWORD: '',
            PASSWORD_SALT: 'default_salt_change_me',
            SUPPORT_WHATSAPP: '',
            SUPPORT_EMAIL: '',
            SUPPORT_PHONE: '',
            RENEWAL_WEBSITE_URL: 'https://example.com'
        };
    }

    /**
     * Get environment variable value
     */
    get(key, defaultValue = null) {
        return this.env[key] || defaultValue;
    }

    /**
     * Check if environment is production
     */
    isProduction() {
        return this.get('APP_ENVIRONMENT') === 'production';
    }

    /**
     * Check if environment is development
     */
    isDevelopment() {
        return this.get('APP_ENVIRONMENT') === 'development';
    }

    /**
     * Get all environment variables (for debugging - use carefully)
     */
    getAll() {
        if (!this.isProduction()) {
            return { ...this.env };
        }
        
        // In production, only return non-sensitive variables
        const safeVars = {};
        const sensitiveKeys = [
            'SUPABASE_ANON_KEY', 
            'ADMIN_PASSWORD', 
            'PASSWORD_SALT'
        ];
        
        for (const [key, value] of Object.entries(this.env)) {
            if (!sensitiveKeys.includes(key)) {
                safeVars[key] = value;
            }
        }
        
        return safeVars;
    }
}

// Create global instance
const envLoader = new EnvironmentLoader();

// Auto-load environment variables when script loads
document.addEventListener('DOMContentLoaded', async () => {
    await envLoader.loadEnvironment();
    
    // Dispatch custom event when environment is loaded
    window.dispatchEvent(new CustomEvent('environmentLoaded', {
        detail: { env: window.ENV }
    }));
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentLoader;
}

// Make available globally
window.EnvironmentLoader = EnvironmentLoader;
window.envLoader = envLoader;
