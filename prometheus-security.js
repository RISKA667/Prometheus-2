/**
 * PROMETHEUS - SECURITY MODULE
 * BRDN Conseils - Security Layer
 */

'use strict';

// Importer bcryptjs
const bcrypt = require('bcryptjs');

class SecurityManager {
    constructor() {
        this.saltRounds = 12; // Sécurité renforcée
    }

    // Hasher un mot de passe de manière sécurisée
    async hashPassword(password) {
        try {
            return await bcrypt.hash(password, this.saltRounds);
        } catch (error) {
            console.error('Password hashing failed:', error);
            throw new Error('Password hashing failed');
        }
    }

    // Vérifier un mot de passe
    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            console.error('Password verification failed:', error);
            return false;
        }
    }

    // Générer un mot de passe temporaire sécurisé
    generateSecurePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

    // Valider la force d'un mot de passe
    validatePasswordStrength(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('Le mot de passe doit contenir au moins 8 caractères');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins une majuscule');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins une minuscule');
        }
        
        if (!/[0-9]/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins un chiffre');
        }
        
        if (!/[!@#$%^&*]/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins un caractère spécial');
        }
        
        return {
            isValid: errors.length === 0,
            strength: this.calculatePasswordStrength(password),
            errors: errors
        };
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        // Longueur
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Complexité
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[!@#$%^&*]/.test(password)) score++;
        
        // Score final
        if (score < 3) return 'faible';
        if (score < 5) return 'moyen';
        return 'fort';
    }
}

// Exporter pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
} else {
    window.SecurityManager = SecurityManager;
}