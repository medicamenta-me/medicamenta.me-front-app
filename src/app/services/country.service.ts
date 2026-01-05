import { Injectable, inject } from '@angular/core';
import { LogService } from './log.service';

export interface CountryDocument {
    code: string; // Country code (ISO 3166-1 alpha-2)
    name: string;
    flag: string; // Emoji flag
    documentType: string; // Document type name
    documentLabel: string; // Label to show in form
    documentMask: string; // Mask pattern for input
    documentPlaceholder: string; // Placeholder example
    documentValidation?: RegExp; // Optional regex for validation
    // Phone formatting
    phoneCode: string; // International dialing code (e.g., '+55', '+1')
    phoneMask: string; // Mask pattern for phone number
    phonePlaceholder: string; // Placeholder example for phone
    phoneValidation?: RegExp; // Optional regex for phone validation
    // Language
    language?: string; // Default language for this country (pt, en, es)
}

@Injectable({
    providedIn: 'root'
})
export class CountryService {
    private readonly logService = inject(LogService);
    
    private readonly countries: CountryDocument[] = [
        {
            code: 'BR',
            name: 'Brasil',
            flag: '🇧🇷',
            phoneCode: '+55',
            documentType: 'CPF',
            documentLabel: 'CPF',
            documentMask: '000.000.000-00',
            documentPlaceholder: '000.000.000-00',
            documentValidation: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
            phoneMask: '(00) 00000-0000',
            phonePlaceholder: '(11) 98765-4321',
            phoneValidation: /^\(\d{2}\) \d{4,5}-\d{4}$/,
            language: 'pt'
        },
        {
            code: 'AR',
            name: 'Argentina',
            flag: '🇦🇷',
            phoneCode: '+54',
            documentType: 'DNI',
            documentLabel: 'DNI',
            documentMask: '00.000.000',
            documentPlaceholder: '12.345.678',
            documentValidation: /^\d{2}\.\d{3}\.\d{3}$/,
            phoneMask: '00 0000-0000',
            phonePlaceholder: '11 1234-5678',
            phoneValidation: /^\d{2} \d{4}-\d{4}$/,
            language: 'es'
        },
        {
            code: 'CL',
            name: 'Chile',
            flag: '🇨🇱',
            phoneCode: '+56',
            documentType: 'RUT',
            documentLabel: 'RUT',
            documentMask: '00.000.000-0',
            documentPlaceholder: '12.345.678-9',
            documentValidation: /^\d{2}\.\d{3}\.\d{3}-[\dkK]$/,
            phoneMask: '0 0000 0000',
            phonePlaceholder: '9 8765 4321',
            phoneValidation: /^\d \d{4} \d{4}$/,
            language: 'es'
        },
        {
            code: 'CO',
            name: 'Colômbia',
            flag: '🇨🇴',
            phoneCode: '+57',
            documentType: 'CC',
            documentLabel: 'Cédula de Ciudadanía',
            documentMask: '0.000.000.000',
            documentPlaceholder: '1.234.567.890',
            documentValidation: /^\d\.\d{3}\.\d{3}\.\d{3}$/,
            phoneMask: '000 000 0000',
            phonePlaceholder: '321 123 4567',
            phoneValidation: /^\d{3} \d{3} \d{4}$/,
            language: 'es'
        },
        {
            code: 'MX',
            name: 'México',
            flag: '🇲🇽',
            phoneCode: '+52',
            documentType: 'CURP',
            documentLabel: 'CURP',
            documentMask: 'AAAA000000AAAAAA00',
            documentPlaceholder: 'CURP1234567890AB01',
            documentValidation: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/,
            phoneMask: '00 0000 0000',
            phonePlaceholder: '55 1234 5678',
            phoneValidation: /^\d{2} \d{4} \d{4}$/,
            language: 'es'
        },
        {
            code: 'PE',
            name: 'Peru',
            flag: '🇵🇪',
            phoneCode: '+51',
            documentType: 'DNI',
            documentLabel: 'DNI',
            documentMask: '00000000',
            documentPlaceholder: '12345678',
            documentValidation: /^\d{8}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '987 654 321',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'es'
        },
        {
            code: 'UY',
            name: 'Uruguai',
            flag: '🇺🇾',
            phoneCode: '+598',
            documentType: 'CI',
            documentLabel: 'Cédula de Identidad',
            documentMask: '0.000.000-0',
            documentPlaceholder: '1.234.567-8',
            documentValidation: /^\d\.\d{3}\.\d{3}-\d$/,
            phoneMask: '00 000 000',
            phonePlaceholder: '94 123 456',
            phoneValidation: /^\d{2} \d{3} \d{3}$/,
            language: 'pt'
        },
        {
            code: 'PY',
            name: 'Paraguai',
            flag: '🇵🇾',
            phoneCode: '+595',
            documentType: 'CI',
            documentLabel: 'Cédula de Identidad',
            documentMask: '0.000.000',
            documentPlaceholder: '1.234.567',
            documentValidation: /^\d\.\d{3}\.\d{3}$/,
            phoneMask: '000 000000',
            phonePlaceholder: '981 123456',
            phoneValidation: /^\d{3} \d{6}$/,
            language: 'es'
        },
        {
            code: 'BO',
            name: 'Bolívia',
            flag: '🇧🇴',
            phoneCode: '+591',
            documentType: 'CI',
            documentLabel: 'Carnet de Identidad',
            documentMask: '0000000',
            documentPlaceholder: '1234567',
            documentValidation: /^\d{7}$/,
            phoneMask: '0 000 0000',
            phonePlaceholder: '7 123 4567',
            phoneValidation: /^\d \d{3} \d{4}$/,
            language: 'es'
        },
        {
            code: 'EC',
            name: 'Equador',
            flag: '🇪🇨',
            phoneCode: '+593',
            documentType: 'CI',
            documentLabel: 'Cédula de Identidad',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '98 765 4321',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'es'
        },
        {
            code: 'VE',
            name: 'Venezuela',
            flag: '🇻🇪',
            phoneCode: '+58',
            documentType: 'CI',
            documentLabel: 'Cédula de Identidad',
            documentMask: 'A-00.000.000',
            documentPlaceholder: 'V-12.345.678',
            documentValidation: /^[VE]-\d{2}\.\d{3}\.\d{3}$/,
            phoneMask: '000 000-0000',
            phonePlaceholder: '412 123-4567',
            phoneValidation: /^\d{3} \d{3}-\d{4}$/,
            language: 'es'
        },
        {
            code: 'US',
            name: 'Estados Unidos',
            flag: '🇺🇸',
            phoneCode: '+1',
            documentType: 'SSN',
            documentLabel: 'Social Security Number',
            documentMask: '000-00-0000',
            documentPlaceholder: '123-45-6789',
            documentValidation: /^\d{3}-\d{2}-\d{4}$/,
            phoneMask: '(000) 000-0000',
            phonePlaceholder: '(555) 123-4567',
            phoneValidation: /^\(\d{3}\) \d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'PT',
            name: 'Portugal',
            flag: '🇵🇹',
            phoneCode: '+351',
            documentType: 'NIF',
            documentLabel: 'NIF',
            documentMask: '000000000',
            documentPlaceholder: '123456789',
            documentValidation: /^\d{9}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '912 345 678',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'pt'
        },
        {
            code: 'ES',
            name: 'Espanha',
            flag: '🇪🇸',
            phoneCode: '+34',
            documentType: 'DNI',
            documentLabel: 'DNI',
            documentMask: '00000000A',
            documentPlaceholder: '12345678Z',
            documentValidation: /^\d{8}[A-Z]$/,
            phoneMask: '000 00 00 00',
            phonePlaceholder: '612 34 56 78',
            phoneValidation: /^\d{3} \d{2} \d{2} \d{2}$/,
            language: 'es'
        },
        {
            code: 'FR',
            name: 'França',
            flag: '🇫🇷',
            phoneCode: '+33',
            documentType: 'CNI',
            documentLabel: 'Carte Nationale d\'Identité',
            documentMask: '000000000000',
            documentPlaceholder: '123456789012',
            documentValidation: /^\d{12}$/,
            phoneMask: '0 00 00 00 00',
            phonePlaceholder: '6 12 34 56 78',
            phoneValidation: /^\d \d{2} \d{2} \d{2} \d{2}$/,
            language: 'es'
        },
        {
            code: 'DE',
            name: 'Alemanha',
            flag: '🇩🇪',
            phoneCode: '+49',
            documentType: 'Personalausweis',
            documentLabel: 'Personalausweis',
            documentMask: 'A00000000',
            documentPlaceholder: 'L01234567',
            documentValidation: /^[A-Z]\d{8}$/,
            phoneMask: '000 00000000',
            phonePlaceholder: '151 12345678',
            phoneValidation: /^\d{3} \d{8}$/,
            language: 'es'
        },
        {
            code: 'IT',
            name: 'Itália',
            flag: '🇮🇹',
            phoneCode: '+39',
            documentType: 'CI',
            documentLabel: 'Carta d\'Identità',
            documentMask: 'AA0000000',
            documentPlaceholder: 'AB1234567',
            documentValidation: /^[A-Z]{2}\d{7}$/,
            phoneMask: '000 000 0000',
            phonePlaceholder: '320 123 4567',
            phoneValidation: /^\d{3} \d{3} \d{4}$/,
            language: 'es'
        },
        {
            code: 'GB',
            name: 'Reino Unido',
            flag: '🇬🇧',
            phoneCode: '+44',
            documentType: 'Passport',
            documentLabel: 'Passport Number',
            documentMask: '000000000',
            documentPlaceholder: '123456789',
            documentValidation: /^\d{9}$/,
            phoneMask: '0000 000000',
            phonePlaceholder: '7700 123456',
            phoneValidation: /^\d{4} \d{6}$/,
            language: 'es'
        },
        {
            code: 'NL',
            name: 'Holanda',
            flag: '🇳🇱',
            phoneCode: '+31',
            documentType: 'BSN',
            documentLabel: 'BSN (Burgerservicenummer)',
            documentMask: '000000000',
            documentPlaceholder: '123456782',
            documentValidation: /^\d{9}$/,
            phoneMask: '0 00000000',
            phonePlaceholder: '6 12345678',
            phoneValidation: /^\d \d{8}$/,
            language: 'es'
        },
        {
            code: 'BE',
            name: 'Bélgica',
            flag: '🇧🇪',
            phoneCode: '+32',
            documentType: 'Carte d\'Identité',
            documentLabel: 'Carte d\'Identité',
            documentMask: '000-0000000-00',
            documentPlaceholder: '123-4567890-12',
            documentValidation: /^\d{3}-\d{7}-\d{2}$/,
            phoneMask: '000 00 00 00',
            phonePlaceholder: '470 12 34 56',
            phoneValidation: /^\d{3} \d{2} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'SE',
            name: 'Suécia',
            flag: '🇸🇪',
            phoneCode: '+46',
            documentType: 'Personnummer',
            documentLabel: 'Personnummer',
            documentMask: '000000-0000',
            documentPlaceholder: '123456-7890',
            documentValidation: /^\d{6}-\d{4}$/,
            phoneMask: '00 000 00 00',
            phonePlaceholder: '70 123 45 67',
            phoneValidation: /^\d{2} \d{3} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'NO',
            name: 'Noruega',
            flag: '🇳🇴',
            phoneCode: '+47',
            documentType: 'Fødselsnummer',
            documentLabel: 'Fødselsnummer',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '000 00 000',
            phonePlaceholder: '412 34 567',
            phoneValidation: /^\d{3} \d{2} \d{3}$/,
            language: 'en'
        },
        {
            code: 'DK',
            name: 'Dinamarca',
            flag: '🇩🇰',
            phoneCode: '+45',
            documentType: 'CPR',
            documentLabel: 'CPR-nummer',
            documentMask: '000000-0000',
            documentPlaceholder: '123456-7890',
            documentValidation: /^\d{6}-\d{4}$/,
            phoneMask: '00 00 00 00',
            phonePlaceholder: '12 34 56 78',
            phoneValidation: /^\d{2} \d{2} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'FI',
            name: 'Finlândia',
            flag: '🇫🇮',
            phoneCode: '+358',
            documentType: 'HETU',
            documentLabel: 'Henkilötunnus',
            documentMask: '000000A000A',
            documentPlaceholder: '010190-123A',
            documentValidation: /^\d{6}[A+-]\d{3}[A-Z0-9]$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '40 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'PL',
            name: 'Polônia',
            flag: '🇵🇱',
            phoneCode: '+48',
            documentType: 'PESEL',
            documentLabel: 'PESEL',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '501 234 567',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'AT',
            name: 'Áustria',
            flag: '🇦🇹',
            phoneCode: '+43',
            documentType: 'Personalausweis',
            documentLabel: 'Personalausweis',
            documentMask: '00000000',
            documentPlaceholder: '12345678',
            documentValidation: /^\d{8}$/,
            phoneMask: '000 0000000',
            phonePlaceholder: '664 1234567',
            phoneValidation: /^\d{3} \d{7}$/,
            language: 'en'
        },
        {
            code: 'CH',
            name: 'Suíça',
            flag: '🇨🇭',
            phoneCode: '+41',
            documentType: 'AVS',
            documentLabel: 'Numéro AVS',
            documentMask: '000.0000.0000.00',
            documentPlaceholder: '756.1234.5678.90',
            documentValidation: /^\d{3}\.\d{4}\.\d{4}\.\d{2}$/,
            phoneMask: '00 000 00 00',
            phonePlaceholder: '79 123 45 67',
            phoneValidation: /^\d{2} \d{3} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'GR',
            name: 'Grécia',
            flag: '🇬🇷',
            phoneCode: '+30',
            documentType: 'ADT',
            documentLabel: 'Αριθμός Δελτίου Ταυτότητας',
            documentMask: 'AA000000',
            documentPlaceholder: 'AB123456',
            documentValidation: /^[A-Z]{2}\d{6}$/,
            phoneMask: '000 000 0000',
            phonePlaceholder: '690 123 4567',
            phoneValidation: /^\d{3} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'CZ',
            name: 'República Tcheca',
            flag: '🇨🇿',
            phoneCode: '+420',
            documentType: 'RČ',
            documentLabel: 'Rodné číslo',
            documentMask: '000000/0000',
            documentPlaceholder: '123456/7890',
            documentValidation: /^\d{6}\/\d{4}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '601 234 567',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'IE',
            name: 'Irlanda',
            flag: '🇮🇪',
            phoneCode: '+353',
            documentType: 'PPS',
            documentLabel: 'PPS Number',
            documentMask: '0000000AA',
            documentPlaceholder: '1234567AB',
            documentValidation: /^\d{7}[A-Z]{2}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '85 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'RO',
            name: 'Romênia',
            flag: '🇷🇴',
            phoneCode: '+40',
            documentType: 'CNP',
            documentLabel: 'CNP (Cod Numeric Personal)',
            documentMask: '0000000000000',
            documentPlaceholder: '1234567890123',
            documentValidation: /^\d{13}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '712 345 678',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'HU',
            name: 'Hungria',
            flag: '🇭🇺',
            phoneCode: '+36',
            documentType: 'Személyi',
            documentLabel: 'Személyi igazolvány',
            documentMask: '000000AA',
            documentPlaceholder: '123456AB',
            documentValidation: /^\d{6}[A-Z]{2}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '20 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'SK',
            name: 'Eslováquia',
            flag: '🇸🇰',
            phoneCode: '+421',
            documentType: 'RČ',
            documentLabel: 'Rodné číslo',
            documentMask: '000000/0000',
            documentPlaceholder: '123456/7890',
            documentValidation: /^\d{6}\/\d{4}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '901 234 567',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'BG',
            name: 'Bulgária',
            flag: '🇧🇬',
            phoneCode: '+359',
            documentType: 'EGN',
            documentLabel: 'ЕГН (Единен граждански номер)',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '876 123 456',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'HR',
            name: 'Croácia',
            flag: '🇭🇷',
            phoneCode: '+385',
            documentType: 'OIB',
            documentLabel: 'OIB (Osobni identifikacijski broj)',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '91 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'SI',
            name: 'Eslovênia',
            flag: '🇸🇮',
            phoneCode: '+386',
            documentType: 'EMŠO',
            documentLabel: 'EMŠO',
            documentMask: '0000000000000',
            documentPlaceholder: '1234567890123',
            documentValidation: /^\d{13}$/,
            phoneMask: '00 000 000',
            phonePlaceholder: '31 123 456',
            phoneValidation: /^\d{2} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'LT',
            name: 'Lituânia',
            flag: '🇱🇹',
            phoneCode: '+370',
            documentType: 'AK',
            documentLabel: 'Asmens kodas',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '000 00000',
            phonePlaceholder: '612 34567',
            phoneValidation: /^\d{3} \d{5}$/,
            language: 'en'
        },
        {
            code: 'LV',
            name: 'Letônia',
            flag: '🇱🇻',
            phoneCode: '+371',
            documentType: 'PK',
            documentLabel: 'Personas kods',
            documentMask: '000000-00000',
            documentPlaceholder: '123456-78901',
            documentValidation: /^\d{6}-\d{5}$/,
            phoneMask: '00 000 000',
            phonePlaceholder: '20 123 456',
            phoneValidation: /^\d{2} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'EE',
            name: 'Estônia',
            flag: '🇪🇪',
            phoneCode: '+372',
            documentType: 'IK',
            documentLabel: 'Isikukood',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '5123 4567',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'LU',
            name: 'Luxemburgo',
            flag: '🇱🇺',
            phoneCode: '+352',
            documentType: 'Matricule',
            documentLabel: 'Numéro de matricule',
            documentMask: '0000000000000',
            documentPlaceholder: '1234567890123',
            documentValidation: /^\d{13}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '621 123 456',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'MT',
            name: 'Malta',
            flag: '🇲🇹',
            phoneCode: '+356',
            documentType: 'ID Card',
            documentLabel: 'Identity Card',
            documentMask: '0000000A',
            documentPlaceholder: '1234567M',
            documentValidation: /^\d{7}[A-Z]$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '9123 4567',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'CY',
            name: 'Chipre',
            flag: '🇨🇾',
            phoneCode: '+357',
            documentType: 'ID Card',
            documentLabel: 'Identity Card',
            documentMask: '00000000',
            documentPlaceholder: '12345678',
            documentValidation: /^\d{8}$/,
            phoneMask: '00 000000',
            phonePlaceholder: '96 123456',
            phoneValidation: /^\d{2} \d{6}$/,
            language: 'en'
        },
        {
            code: 'IS',
            name: 'Islândia',
            flag: '🇮🇸',
            phoneCode: '+354',
            documentType: 'Kennitala',
            documentLabel: 'Kennitala',
            documentMask: '000000-0000',
            documentPlaceholder: '123456-7890',
            documentValidation: /^\d{6}-\d{4}$/,
            phoneMask: '000 0000',
            phonePlaceholder: '611 2345',
            phoneValidation: /^\d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'AL',
            name: 'Albânia',
            flag: '🇦🇱',
            phoneCode: '+355',
            documentType: 'ID Card',
            documentLabel: 'Letërnjoftim',
            documentMask: 'A00000000A',
            documentPlaceholder: 'I12345678L',
            documentValidation: /^[A-Z]\d{8}[A-Z]$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '67 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'RS',
            name: 'Sérvia',
            flag: '🇷🇸',
            phoneCode: '+381',
            documentType: 'JMBG',
            documentLabel: 'JMBG',
            documentMask: '0000000000000',
            documentPlaceholder: '1234567890123',
            documentValidation: /^\d{13}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '61 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'UA',
            name: 'Ucrânia',
            flag: '🇺🇦',
            phoneCode: '+380',
            documentType: 'IPN',
            documentLabel: 'ІПН (Ідентифікаційний номер)',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '00 000 00 00',
            phonePlaceholder: '50 123 45 67',
            phoneValidation: /^\d{2} \d{3} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'TR',
            name: 'Turquia',
            flag: '🇹🇷',
            phoneCode: '+90',
            documentType: 'TC Kimlik',
            documentLabel: 'TC Kimlik No',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '000 000 00 00',
            phonePlaceholder: '532 123 45 67',
            phoneValidation: /^\d{3} \d{3} \d{2} \d{2}$/,
            language: 'en'
        },
        // Ásia
        {
            code: 'CN',
            name: 'China',
            flag: '🇨🇳',
            phoneCode: '+86',
            documentType: 'ID Card',
            documentLabel: '身份证 (ID Card)',
            documentMask: '000000000000000000',
            documentPlaceholder: '123456789012345678',
            documentValidation: /^\d{18}$/,
            phoneMask: '000 0000 0000',
            phonePlaceholder: '138 0013 8000',
            phoneValidation: /^\d{3} \d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'IN',
            name: 'Índia',
            flag: '🇮🇳',
            phoneCode: '+91',
            documentType: 'Aadhaar',
            documentLabel: 'Aadhaar Number',
            documentMask: '0000 0000 0000',
            documentPlaceholder: '1234 5678 9012',
            documentValidation: /^\d{4} \d{4} \d{4}$/,
            phoneMask: '00000 00000',
            phonePlaceholder: '98765 43210',
            phoneValidation: /^\d{5} \d{5}$/,
            language: 'en'
        },
        {
            code: 'JP',
            name: 'Japão',
            flag: '🇯🇵',
            phoneCode: '+81',
            documentType: 'My Number',
            documentLabel: 'マイナンバー (My Number)',
            documentMask: '0000 0000 0000',
            documentPlaceholder: '1234 5678 9012',
            documentValidation: /^\d{4} \d{4} \d{4}$/,
            phoneMask: '00 0000 0000',
            phonePlaceholder: '90 1234 5678',
            phoneValidation: /^\d{2} \d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'KR',
            name: 'Coreia do Sul',
            flag: '🇰🇷',
            phoneCode: '+82',
            documentType: 'RRN',
            documentLabel: '주민등록번호 (Resident Registration Number)',
            documentMask: '000000-0000000',
            documentPlaceholder: '123456-1234567',
            documentValidation: /^\d{6}-\d{7}$/,
            phoneMask: '00 0000 0000',
            phonePlaceholder: '10 1234 5678',
            phoneValidation: /^\d{2} \d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'ID',
            name: 'Indonésia',
            flag: '🇮🇩',
            phoneCode: '+62',
            documentType: 'KTP',
            documentLabel: 'KTP (Kartu Tanda Penduduk)',
            documentMask: '0000000000000000',
            documentPlaceholder: '1234567890123456',
            documentValidation: /^\d{16}$/,
            phoneMask: '000 0000 0000',
            phonePlaceholder: '812 3456 7890',
            phoneValidation: /^\d{3} \d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'PK',
            name: 'Paquistão',
            flag: '🇵🇰',
            phoneCode: '+92',
            documentType: 'CNIC',
            documentLabel: 'CNIC (Computerized National Identity Card)',
            documentMask: '00000-0000000-0',
            documentPlaceholder: '12345-1234567-1',
            documentValidation: /^\d{5}-\d{7}-\d$/,
            phoneMask: '000 0000000',
            phonePlaceholder: '300 1234567',
            phoneValidation: /^\d{3} \d{7}$/,
            language: 'en'
        },
        {
            code: 'BD',
            name: 'Bangladesh',
            flag: '🇧🇩',
            phoneCode: '+880',
            documentType: 'NID',
            documentLabel: 'NID (National ID)',
            documentMask: '0000000000000',
            documentPlaceholder: '1234567890123',
            documentValidation: /^\d{10,13}$/,
            phoneMask: '0000-000000',
            phonePlaceholder: '1712-345678',
            phoneValidation: /^\d{4}-\d{6}$/,
            language: 'en'
        },
        {
            code: 'PH',
            name: 'Filipinas',
            flag: '🇵🇭',
            phoneCode: '+63',
            documentType: 'PhilSys ID',
            documentLabel: 'PhilSys ID Number',
            documentMask: '0000-0000-0000',
            documentPlaceholder: '1234-5678-9012',
            documentValidation: /^\d{4}-\d{4}-\d{4}$/,
            phoneMask: '000 000 0000',
            phonePlaceholder: '917 123 4567',
            phoneValidation: /^\d{3} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'VN',
            name: 'Vietnã',
            flag: '🇻🇳',
            phoneCode: '+84',
            documentType: 'CCCD',
            documentLabel: 'CCCD (Căn cước công dân)',
            documentMask: '000000000000',
            documentPlaceholder: '123456789012',
            documentValidation: /^\d{12}$/,
            phoneMask: '00 0000 0000',
            phonePlaceholder: '90 1234 5678',
            phoneValidation: /^\d{2} \d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'TH',
            name: 'Tailândia',
            flag: '🇹🇭',
            phoneCode: '+66',
            documentType: 'ID Card',
            documentLabel: 'บัตรประชาชน (ID Card)',
            documentMask: '0-0000-00000-00-0',
            documentPlaceholder: '1-2345-67890-12-3',
            documentValidation: /^\d-\d{4}-\d{5}-\d{2}-\d$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '81 234 5678',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'MY',
            name: 'Malásia',
            flag: '🇲🇾',
            phoneCode: '+60',
            documentType: 'MyKad',
            documentLabel: 'MyKad (IC Number)',
            documentMask: '000000-00-0000',
            documentPlaceholder: '123456-01-2345',
            documentValidation: /^\d{6}-\d{2}-\d{4}$/,
            phoneMask: '00-000 0000',
            phonePlaceholder: '12-345 6789',
            phoneValidation: /^\d{2}-\d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'SG',
            name: 'Singapura',
            flag: '🇸🇬',
            phoneCode: '+65',
            documentType: 'NRIC',
            documentLabel: 'NRIC/FIN',
            documentMask: 'A0000000A',
            documentPlaceholder: 'S1234567D',
            documentValidation: /^[STFG]\d{7}[A-Z]$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '8123 4567',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'SA',
            name: 'Arábia Saudita',
            flag: '🇸🇦',
            phoneCode: '+966',
            documentType: 'National ID',
            documentLabel: 'رقم الهوية الوطنية (National ID)',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '50 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'AE',
            name: 'Emirados Árabes Unidos',
            flag: '🇦🇪',
            phoneCode: '+971',
            documentType: 'Emirates ID',
            documentLabel: 'Emirates ID',
            documentMask: '000-0000-0000000-0',
            documentPlaceholder: '784-1234-1234567-1',
            documentValidation: /^\d{3}-\d{4}-\d{7}-\d$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '50 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'IL',
            name: 'Israel',
            flag: '🇮🇱',
            phoneCode: '+972',
            documentType: 'Teudat Zehut',
            documentLabel: 'תעודת זהות (Teudat Zehut)',
            documentMask: '000000000',
            documentPlaceholder: '123456789',
            documentValidation: /^\d{9}$/,
            phoneMask: '00-000-0000',
            phonePlaceholder: '50-123-4567',
            phoneValidation: /^\d{2}-\d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'IQ',
            name: 'Iraque',
            flag: '🇮🇶',
            phoneCode: '+964',
            documentType: 'National ID',
            documentLabel: 'رقم البطاقة الوطنية (National ID)',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '000 000 0000',
            phonePlaceholder: '770 123 4567',
            phoneValidation: /^\d{3} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'AF',
            name: 'Afeganistão',
            flag: '🇦🇫',
            phoneCode: '+93',
            documentType: 'Tazkira',
            documentLabel: 'تذکره (Tazkira)',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '70 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'NP',
            name: 'Nepal',
            flag: '🇳🇵',
            phoneCode: '+977',
            documentType: 'Citizenship',
            documentLabel: 'Citizenship Number',
            documentMask: '00-00-00-00000',
            documentPlaceholder: '12-34-56-78901',
            documentValidation: /^\d{2}-\d{2}-\d{2}-\d{5}$/,
            phoneMask: '00-000-0000',
            phonePlaceholder: '98-123-4567',
            phoneValidation: /^\d{2}-\d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'LK',
            name: 'Sri Lanka',
            flag: '🇱🇰',
            phoneCode: '+94',
            documentType: 'NIC',
            documentLabel: 'NIC (National Identity Card)',
            documentMask: '000000000A',
            documentPlaceholder: '123456789V',
            documentValidation: /^\d{9}[VX]$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '71 234 5678',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'MM',
            name: 'Mianmar',
            flag: '🇲🇲',
            phoneCode: '+95',
            documentType: 'NRC',
            documentLabel: 'NRC (National Registration Card)',
            documentMask: '00/AAA(A)000000',
            documentPlaceholder: '12/ABC(N)123456',
            documentValidation: /^\d{1,2}\/[A-Z]{3}\([A-Z]\)\d{6}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '91 234 5678',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'KH',
            name: 'Camboja',
            flag: '🇰🇭',
            phoneCode: '+855',
            documentType: 'National ID',
            documentLabel: 'National ID Card',
            documentMask: '000000000',
            documentPlaceholder: '123456789',
            documentValidation: /^\d{9}$/,
            phoneMask: '00 000 000',
            phonePlaceholder: '12 345 678',
            phoneValidation: /^\d{2} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'LA',
            name: 'Laos',
            flag: '🇱🇦',
            phoneCode: '+856',
            documentType: 'National ID',
            documentLabel: 'National ID Card',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '00 00 000 000',
            phonePlaceholder: '20 12 345 678',
            phoneValidation: /^\d{2} \d{2} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'KZ',
            name: 'Cazaquistão',
            flag: '🇰🇿',
            phoneCode: '+7',
            documentType: 'IIN',
            documentLabel: 'ИИН (Individual Identification Number)',
            documentMask: '000000000000',
            documentPlaceholder: '123456789012',
            documentValidation: /^\d{12}$/,
            phoneMask: '000 000 00 00',
            phonePlaceholder: '701 234 56 78',
            phoneValidation: /^\d{3} \d{3} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'UZ',
            name: 'Uzbequistão',
            flag: '🇺🇿',
            phoneCode: '+998',
            documentType: 'Passport',
            documentLabel: 'Passport ID',
            documentMask: 'AA0000000',
            documentPlaceholder: 'AB1234567',
            documentValidation: /^[A-Z]{2}\d{7}$/,
            phoneMask: '00 000 00 00',
            phonePlaceholder: '90 123 45 67',
            phoneValidation: /^\d{2} \d{3} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'GE',
            name: 'Geórgia',
            flag: '🇬🇪',
            phoneCode: '+995',
            documentType: 'ID Card',
            documentLabel: 'პირადობის მოწმობა (ID Card)',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '000 00 00 00',
            phonePlaceholder: '555 12 34 56',
            phoneValidation: /^\d{3} \d{2} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'AM',
            name: 'Armênia',
            flag: '🇦🇲',
            phoneCode: '+374',
            documentType: 'ID Card',
            documentLabel: 'Անձնագիր (ID Card)',
            documentMask: 'AA0000000',
            documentPlaceholder: 'AN1234567',
            documentValidation: /^[A-Z]{2}\d{7}$/,
            phoneMask: '00 000000',
            phonePlaceholder: '91 123456',
            phoneValidation: /^\d{2} \d{6}$/,
            language: 'en'
        },
        {
            code: 'AZ',
            name: 'Azerbaijão',
            flag: '🇦🇿',
            phoneCode: '+994',
            documentType: 'ID Card',
            documentLabel: 'Şəxsiyyət vəsiqəsi (ID Card)',
            documentMask: 'AAA000000',
            documentPlaceholder: 'AZE123456',
            documentValidation: /^[A-Z]{3}\d{6}$/,
            phoneMask: '00 000 00 00',
            phonePlaceholder: '50 123 45 67',
            phoneValidation: /^\d{2} \d{3} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'JO',
            name: 'Jordânia',
            flag: '🇯🇴',
            phoneCode: '+962',
            documentType: 'National ID',
            documentLabel: 'الرقم الوطني (National ID)',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '0 0000 0000',
            phonePlaceholder: '7 9123 4567',
            phoneValidation: /^\d \d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'LB',
            name: 'Líbano',
            flag: '🇱🇧',
            phoneCode: '+961',
            documentType: 'ID Card',
            documentLabel: 'بطاقة الهوية (ID Card)',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '00 000 000',
            phonePlaceholder: '71 123 456',
            phoneValidation: /^\d{2} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'KW',
            name: 'Kuwait',
            flag: '🇰🇼',
            phoneCode: '+965',
            documentType: 'Civil ID',
            documentLabel: 'البطاقة المدنية (Civil ID)',
            documentMask: '000000000000',
            documentPlaceholder: '123456789012',
            documentValidation: /^\d{12}$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '9123 4567',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'OM',
            name: 'Omã',
            flag: '🇴🇲',
            phoneCode: '+968',
            documentType: 'Civil ID',
            documentLabel: 'البطاقة المدنية (Civil ID)',
            documentMask: '00000000',
            documentPlaceholder: '12345678',
            documentValidation: /^\d{8}$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '9123 4567',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'QA',
            name: 'Catar',
            flag: '🇶🇦',
            phoneCode: '+974',
            documentType: 'QID',
            documentLabel: 'بطاقة الهوية القطرية (QID)',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '3312 3456',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'BH',
            name: 'Bahrein',
            flag: '🇧🇭',
            phoneCode: '+973',
            documentType: 'CPR',
            documentLabel: 'رقم السجل السكاني (CPR)',
            documentMask: '000000000',
            documentPlaceholder: '123456789',
            documentValidation: /^\d{9}$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '3312 3456',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'MN',
            name: 'Mongólia',
            flag: '🇲🇳',
            phoneCode: '+976',
            documentType: 'ID Card',
            documentLabel: 'Иргэний үнэмлэх (ID Card)',
            documentMask: 'AA00000000',
            documentPlaceholder: 'УБ12345678',
            documentValidation: /^[А-ЯA-Z]{2}\d{8}$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '8812 3456',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'en'
        },
        {
            code: 'BT',
            name: 'Butão',
            flag: '🇧🇹',
            phoneCode: '+975',
            documentType: 'CID',
            documentLabel: 'Citizenship ID',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '00 00 00 00',
            phonePlaceholder: '17 12 34 56',
            phoneValidation: /^\d{2} \d{2} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'TJ',
            name: 'Tadjiquistão',
            flag: '🇹🇯',
            phoneCode: '+992',
            documentType: 'Passport',
            documentLabel: 'Passport ID',
            documentMask: 'A0000000',
            documentPlaceholder: 'A1234567',
            documentValidation: /^[A-Z]\d{7}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '91 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'KG',
            name: 'Quirguistão',
            flag: '🇰🇬',
            phoneCode: '+996',
            documentType: 'ID Card',
            documentLabel: 'ID Card',
            documentMask: '0000000000000',
            documentPlaceholder: '1234567890123',
            documentValidation: /^\d{13}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '555 123 456',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'TM',
            name: 'Turcomenistão',
            flag: '🇹🇲',
            phoneCode: '+993',
            documentType: 'ID Card',
            documentLabel: 'ID Card',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '00 000000',
            phonePlaceholder: '65 123456',
            phoneValidation: /^\d{2} \d{6}$/,
            language: 'en'
        },
        {
            code: 'MV',
            name: 'Maldivas',
            flag: '🇲🇻',
            phoneCode: '+960',
            documentType: 'ID Card',
            documentLabel: 'ID Card',
            documentMask: 'A000000',
            documentPlaceholder: 'A123456',
            documentValidation: /^[A-Z]\d{6}$/,
            phoneMask: '000-0000',
            phonePlaceholder: '771-2345',
            phoneValidation: /^\d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'BN',
            name: 'Brunei',
            flag: '🇧🇳',
            phoneCode: '+673',
            documentType: 'IC Number',
            documentLabel: 'IC Number',
            documentMask: '00-000000',
            documentPlaceholder: '12-123456',
            documentValidation: /^\d{2}-\d{6}$/,
            phoneMask: '000-0000',
            phonePlaceholder: '712-3456',
            phoneValidation: /^\d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'TL',
            name: 'Timor-Leste',
            flag: '🇹🇱',
            phoneCode: '+670',
            documentType: 'ID Card',
            documentLabel: 'Cartão de Identidade',
            documentMask: '0000000000000000',
            documentPlaceholder: '1234567890123456',
            documentValidation: /^\d{16}$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '7723 4567',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'pt'
        },
        // África
        {
            code: 'ZA',
            name: 'África do Sul',
            flag: '🇿🇦',
            phoneCode: '+27',
            documentType: 'ID Number',
            documentLabel: 'ID Number',
            documentMask: '0000000000000',
            documentPlaceholder: '1234567890123',
            documentValidation: /^\d{13}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '82 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'EG',
            name: 'Egito',
            flag: '🇪🇬',
            phoneCode: '+20',
            documentType: 'National ID',
            documentLabel: 'الرقم القومي (National ID)',
            documentMask: '00000000000000',
            documentPlaceholder: '12345678901234',
            documentValidation: /^\d{14}$/,
            phoneMask: '000 000 0000',
            phonePlaceholder: '100 123 4567',
            phoneValidation: /^\d{3} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'NG',
            name: 'Nigéria',
            flag: '🇳🇬',
            phoneCode: '+234',
            documentType: 'NIN',
            documentLabel: 'NIN (National Identification Number)',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '000 000 0000',
            phonePlaceholder: '803 123 4567',
            phoneValidation: /^\d{3} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'ET',
            name: 'Etiópia',
            flag: '🇪🇹',
            phoneCode: '+251',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: 'AAA/000000/00',
            documentPlaceholder: 'ETH/123456/19',
            documentValidation: /^[A-Z]{3}\/\d{6}\/\d{2}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '91 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'KE',
            name: 'Quênia',
            flag: '🇰🇪',
            phoneCode: '+254',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: '00000000',
            documentPlaceholder: '12345678',
            documentValidation: /^\d{7,8}$/,
            phoneMask: '000 000000',
            phonePlaceholder: '712 345678',
            phoneValidation: /^\d{3} \d{6}$/,
            language: 'en'
        },
        {
            code: 'TZ',
            name: 'Tanzânia',
            flag: '🇹🇿',
            phoneCode: '+255',
            documentType: 'NIDA',
            documentLabel: 'NIDA Number',
            documentMask: '00000000000000000000',
            documentPlaceholder: '12345678901234567890',
            documentValidation: /^\d{20}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '712 345 678',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'UG',
            name: 'Uganda',
            flag: '🇺🇬',
            phoneCode: '+256',
            documentType: 'NIN',
            documentLabel: 'National ID Number',
            documentMask: 'AAAAA000000000A',
            documentPlaceholder: 'CM123456789012A',
            documentValidation: /^[A-Z]{2}\d{11}[A-Z]$/,
            phoneMask: '000 000000',
            phonePlaceholder: '712 345678',
            phoneValidation: /^\d{3} \d{6}$/,
            language: 'en'
        },
        {
            code: 'DZ',
            name: 'Argélia',
            flag: '🇩🇿',
            phoneCode: '+213',
            documentType: 'CNI',
            documentLabel: 'Carte Nationale d\'Identité',
            documentMask: '000000000000000000',
            documentPlaceholder: '123456789012345678',
            documentValidation: /^\d{18}$/,
            phoneMask: '000 00 00 00',
            phonePlaceholder: '551 23 45 67',
            phoneValidation: /^\d{3} \d{2} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'MA',
            name: 'Marrocos',
            flag: '🇲🇦',
            phoneCode: '+212',
            documentType: 'CIN',
            documentLabel: 'Carte d\'Identité Nationale',
            documentMask: 'AA000000',
            documentPlaceholder: 'AB123456',
            documentValidation: /^[A-Z]{2}\d{6}$/,
            phoneMask: '000-000000',
            phonePlaceholder: '612-345678',
            phoneValidation: /^\d{3}-\d{6}$/,
            language: 'en'
        },
        {
            code: 'GH',
            name: 'Gana',
            flag: '🇬🇭',
            phoneCode: '+233',
            documentType: 'Ghana Card',
            documentLabel: 'Ghana Card',
            documentMask: 'AAA-000000000-0',
            documentPlaceholder: 'GHA-123456789-0',
            documentValidation: /^[A-Z]{3}-\d{9}-\d$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '24 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'AO',
            name: 'Angola',
            flag: '🇦🇴',
            phoneCode: '+244',
            documentType: 'BI',
            documentLabel: 'Bilhete de Identidade',
            documentMask: '000000000AA000',
            documentPlaceholder: '123456789BA001',
            documentValidation: /^\d{9}[A-Z]{2}\d{3}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '923 123 456',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'pt'
        },
        {
            code: 'MZ',
            name: 'Moçambique',
            flag: '🇲🇿',
            phoneCode: '+258',
            documentType: 'BI',
            documentLabel: 'Bilhete de Identidade',
            documentMask: '000000000A',
            documentPlaceholder: '123456789B',
            documentValidation: /^\d{9}[A-Z]$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '84 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'pt'
        },
        {
            code: 'CI',
            name: 'Costa do Marfim',
            flag: '🇨🇮',
            phoneCode: '+225',
            documentType: 'CNI',
            documentLabel: 'Carte Nationale d\'Identité',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '00 00 00 00',
            phonePlaceholder: '07 12 34 56',
            phoneValidation: /^\d{2} \d{2} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'CM',
            name: 'Camarões',
            flag: '🇨🇲',
            phoneCode: '+237',
            documentType: 'CNI',
            documentLabel: 'Carte Nationale d\'Identité',
            documentMask: '000000000',
            documentPlaceholder: '123456789',
            documentValidation: /^\d{9}$/,
            phoneMask: '0 00 00 00 00',
            phonePlaceholder: '6 71 23 45 67',
            phoneValidation: /^\d \d{2} \d{2} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'SN',
            name: 'Senegal',
            flag: '🇸🇳',
            phoneCode: '+221',
            documentType: 'CNI',
            documentLabel: 'Carte Nationale d\'Identité',
            documentMask: '0 000 0000 00000 0',
            documentPlaceholder: '1 234 5678 90123 4',
            documentValidation: /^\d \d{3} \d{4} \d{5} \d$/,
            phoneMask: '00 000 00 00',
            phonePlaceholder: '77 123 45 67',
            phoneValidation: /^\d{2} \d{3} \d{2} \d{2}$/,
            language: 'en'
        },
        {
            code: 'ZW',
            name: 'Zimbábue',
            flag: '🇿🇼',
            phoneCode: '+263',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: '00-000000A00',
            documentPlaceholder: '12-345678A90',
            documentValidation: /^\d{2}-\d{6}[A-Z]\d{2}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '712 345 678',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'RW',
            name: 'Ruanda',
            flag: '🇷🇼',
            phoneCode: '+250',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: '0 0000 0 0000000 0 00',
            documentPlaceholder: '1 1980 7 1234567 8 90',
            documentValidation: /^\d \d{4} \d \d{7} \d \d{2}$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '788 123 456',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'TN',
            name: 'Tunísia',
            flag: '🇹🇳',
            phoneCode: '+216',
            documentType: 'CIN',
            documentLabel: 'Carte d\'Identité Nationale',
            documentMask: '00000000',
            documentPlaceholder: '12345678',
            documentValidation: /^\d{8}$/,
            phoneMask: '00 000 000',
            phonePlaceholder: '20 123 456',
            phoneValidation: /^\d{2} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'LY',
            name: 'Líbia',
            flag: '🇱🇾',
            phoneCode: '+218',
            documentType: 'National ID',
            documentLabel: 'الرقم الوطني (National ID)',
            documentMask: '000000000000',
            documentPlaceholder: '123456789012',
            documentValidation: /^\d{12}$/,
            phoneMask: '00-0000000',
            phonePlaceholder: '91-1234567',
            phoneValidation: /^\d{2}-\d{7}$/,
            language: 'en'
        },
        // Oceania
        {
            code: 'AU',
            name: 'Austrália',
            flag: '🇦🇺',
            phoneCode: '+61',
            documentType: 'Driver License',
            documentLabel: 'Driver License / Medicare',
            documentMask: '0000 00000 0',
            documentPlaceholder: '1234 56789 0',
            documentValidation: /^\d{4} \d{5} \d$/,
            phoneMask: '000 000 000',
            phonePlaceholder: '412 345 678',
            phoneValidation: /^\d{3} \d{3} \d{3}$/,
            language: 'en'
        },
        {
            code: 'NZ',
            name: 'Nova Zelândia',
            flag: '🇳🇿',
            phoneCode: '+64',
            documentType: 'Driver License',
            documentLabel: 'Driver License',
            documentMask: 'AA000000',
            documentPlaceholder: 'AB123456',
            documentValidation: /^[A-Z]{2}\d{6}$/,
            phoneMask: '00 000 0000',
            phonePlaceholder: '21 123 4567',
            phoneValidation: /^\d{2} \d{3} \d{4}$/,
            language: 'en'
        },
        {
            code: 'PG',
            name: 'Papua Nova Guiné',
            flag: '🇵🇬',
            phoneCode: '+675',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '000 00 000',
            phonePlaceholder: '712 34 567',
            phoneValidation: /^\d{3} \d{2} \d{3}$/,
            language: 'en'
        },
        {
            code: 'FJ',
            name: 'Fiji',
            flag: '🇫🇯',
            phoneCode: '+679',
            documentType: 'Birth Certificate',
            documentLabel: 'Birth Certificate No',
            documentMask: '000000',
            documentPlaceholder: '123456',
            documentValidation: /^\d{6}$/,
            phoneMask: '000 0000',
            phonePlaceholder: '712 3456',
            phoneValidation: /^\d{3} \d{4}$/,
            language: 'en'
        },
        // América do Norte e Caribe
        {
            code: 'CA',
            name: 'Canadá',
            flag: '🇨🇦',
            phoneCode: '+1',
            documentType: 'SIN',
            documentLabel: 'Social Insurance Number',
            documentMask: '000-000-000',
            documentPlaceholder: '123-456-789',
            documentValidation: /^\d{3}-\d{3}-\d{3}$/,
            phoneMask: '(000) 000-0000',
            phonePlaceholder: '(416) 123-4567',
            phoneValidation: /^\(\d{3}\) \d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'CU',
            name: 'Cuba',
            flag: '🇨🇺',
            phoneCode: '+53',
            documentType: 'CI',
            documentLabel: 'Carné de Identidad',
            documentMask: '00000000000',
            documentPlaceholder: '12345678901',
            documentValidation: /^\d{11}$/,
            phoneMask: '0 000 0000',
            phonePlaceholder: '5 123 4567',
            phoneValidation: /^\d \d{3} \d{4}$/,
            language: 'es'
        },
        {
            code: 'DO',
            name: 'República Dominicana',
            flag: '🇩🇴',
            phoneCode: '+1',
            documentType: 'Cédula',
            documentLabel: 'Cédula de Identidad',
            documentMask: '000-0000000-0',
            documentPlaceholder: '123-4567890-1',
            documentValidation: /^\d{3}-\d{7}-\d$/,
            phoneMask: '(000) 000-0000',
            phonePlaceholder: '(809) 123-4567',
            phoneValidation: /^\(8[02]9\) \d{3}-\d{4}$/,
            language: 'es'
        },
        {
            code: 'GT',
            name: 'Guatemala',
            flag: '🇬🇹',
            phoneCode: '+502',
            documentType: 'DPI',
            documentLabel: 'DPI (Documento Personal de Identificación)',
            documentMask: '0000 00000 0000',
            documentPlaceholder: '1234 56789 0123',
            documentValidation: /^\d{4} \d{5} \d{4}$/,
            phoneMask: '0000-0000',
            phonePlaceholder: '5123-4567',
            phoneValidation: /^\d{4}-\d{4}$/,
            language: 'es'
        },
        {
            code: 'HN',
            name: 'Honduras',
            flag: '🇭🇳',
            phoneCode: '+504',
            documentType: 'DNI',
            documentLabel: 'DNI',
            documentMask: '0000-0000-00000',
            documentPlaceholder: '1234-5678-90123',
            documentValidation: /^\d{4}-\d{4}-\d{5}$/,
            phoneMask: '0000-0000',
            phonePlaceholder: '9123-4567',
            phoneValidation: /^\d{4}-\d{4}$/,
            language: 'es'
        },
        {
            code: 'NI',
            name: 'Nicarágua',
            flag: '🇳🇮',
            phoneCode: '+505',
            documentType: 'Cédula',
            documentLabel: 'Cédula de Identidad',
            documentMask: '000-000000-0000A',
            documentPlaceholder: '123-456789-0123A',
            documentValidation: /^\d{3}-\d{6}-\d{4}[A-Z]$/,
            phoneMask: '0000 0000',
            phonePlaceholder: '8123 4567',
            phoneValidation: /^\d{4} \d{4}$/,
            language: 'es'
        },
        {
            code: 'CR',
            name: 'Costa Rica',
            flag: '🇨🇷',
            phoneCode: '+506',
            documentType: 'Cédula',
            documentLabel: 'Cédula de Identidad',
            documentMask: '0-0000-0000',
            documentPlaceholder: '1-2345-6789',
            documentValidation: /^\d-\d{4}-\d{4}$/,
            phoneMask: '0000-0000',
            phonePlaceholder: '8312-3456',
            phoneValidation: /^\d{4}-\d{4}$/,
            language: 'es'
        },
        {
            code: 'PA',
            name: 'Panamá',
            flag: '🇵🇦',
            phoneCode: '+507',
            documentType: 'Cédula',
            documentLabel: 'Cédula de Identidad',
            documentMask: '0-000-0000',
            documentPlaceholder: '8-123-4567',
            documentValidation: /^\d-\d{3}-\d{4}$/,
            phoneMask: '0000-0000',
            phonePlaceholder: '6123-4567',
            phoneValidation: /^\d{4}-\d{4}$/,
            language: 'es'
        },
        {
            code: 'SV',
            name: 'El Salvador',
            flag: '🇸🇻',
            phoneCode: '+503',
            documentType: 'DUI',
            documentLabel: 'DUI (Documento Único de Identidad)',
            documentMask: '00000000-0',
            documentPlaceholder: '12345678-9',
            documentValidation: /^\d{8}-\d$/,
            phoneMask: '0000-0000',
            phonePlaceholder: '7123-4567',
            phoneValidation: /^\d{4}-\d{4}$/,
            language: 'es'
        },
        {
            code: 'JM',
            name: 'Jamaica',
            flag: '🇯🇲',
            phoneCode: '+1',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: '000000000000000',
            documentPlaceholder: '123456789012345',
            documentValidation: /^\d{15}$/,
            phoneMask: '(000) 000-0000',
            phonePlaceholder: '(876) 123-4567',
            phoneValidation: /^\(876\) \d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'TT',
            name: 'Trinidad e Tobago',
            flag: '🇹🇹',
            phoneCode: '+1',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: '00000000000000',
            documentPlaceholder: '12345678901234',
            documentValidation: /^\d{14}$/,
            phoneMask: '(000) 000-0000',
            phonePlaceholder: '(868) 123-4567',
            phoneValidation: /^\(868\) \d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'BS',
            name: 'Bahamas',
            flag: '🇧🇸',
            phoneCode: '+1',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: '000000000',
            documentPlaceholder: '123456789',
            documentValidation: /^\d{9}$/,
            phoneMask: '(000) 000-0000',
            phonePlaceholder: '(242) 123-4567',
            phoneValidation: /^\(242\) \d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'HT',
            name: 'Haiti',
            flag: '🇭🇹',
            phoneCode: '+509',
            documentType: 'CIN',
            documentLabel: 'Carte d\'Identité Nationale',
            documentMask: '000-000-000-0',
            documentPlaceholder: '123-456-789-0',
            documentValidation: /^\d{3}-\d{3}-\d{3}-\d$/,
            phoneMask: '00 00 0000',
            phonePlaceholder: '34 12 3456',
            phoneValidation: /^\d{2} \d{2} \d{4}$/,
            language: 'en'
        },
        {
            code: 'BZ',
            name: 'Belize',
            flag: '🇧🇿',
            phoneCode: '+501',
            documentType: 'Social Security',
            documentLabel: 'Social Security Card',
            documentMask: '000-000-0000',
            documentPlaceholder: '123-456-7890',
            documentValidation: /^\d{3}-\d{3}-\d{4}$/,
            phoneMask: '000-0000',
            phonePlaceholder: '612-3456',
            phoneValidation: /^\d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'GY',
            name: 'Guiana',
            flag: '🇬🇾',
            phoneCode: '+592',
            documentType: 'National ID',
            documentLabel: 'National ID',
            documentMask: '000000',
            documentPlaceholder: '123456',
            documentValidation: /^\d{6}$/,
            phoneMask: '000-0000',
            phonePlaceholder: '612-3456',
            phoneValidation: /^\d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'SR',
            name: 'Suriname',
            flag: '🇸🇷',
            phoneCode: '+597',
            documentType: 'ID Card',
            documentLabel: 'ID Card',
            documentMask: '0000000000',
            documentPlaceholder: '1234567890',
            documentValidation: /^\d{10}$/,
            phoneMask: '000-0000',
            phonePlaceholder: '812-3456',
            phoneValidation: /^\d{3}-\d{4}$/,
            language: 'en'
        },
        {
            code: 'OTHER',
            name: 'Outro',
            flag: '🌍',
            phoneCode: '+1',
            documentType: 'ID',
            documentLabel: 'Documento de Identidade',
            documentMask: '',
            documentPlaceholder: 'Digite seu documento',
            documentValidation: undefined,
            phoneMask: '00 00000-0000',
            phonePlaceholder: '00 00000-0000',
            phoneValidation: undefined,
            language: 'en'
        }
    ];

    constructor() { }

    /**
     * Get all available countries
     */
    getCountries(): CountryDocument[] {
        return this.countries;
    }

    /**
     * Get country by code
     */
    getCountryByCode(code: string): CountryDocument | undefined {
        return this.countries.find(c => c.code === code);
    }

    /**
     * Get default country (Brazil)
     */
    getDefaultCountry(): CountryDocument {
        return this.countries[0]; // Brazil
    }

    /**
     * Detect user's country based on browser locale
     */
    detectUserCountry(): CountryDocument {
        try {
            const locale = navigator.language || 'pt-BR';
            const countryCode = locale.split('-')[1]?.toUpperCase();

            if (countryCode) {
                const country = this.getCountryByCode(countryCode);
                if (country) {
                    return country;
                }
            }
        } catch (error: any) {
            this.logService.error('CountryService', 'Error detecting country', error as Error);
        }

        return this.getDefaultCountry();
    }

    /**
     * Apply mask to document value
     */
    applyMask(value: string, mask: string): string {
        if (!mask) return value;

        let maskedValue = '';
        let valueIndex = 0;
        const cleanValue = value.replaceAll(/[^\w]/g, ''); // Remove non-alphanumeric

        for (let i = 0; i < mask.length && valueIndex < cleanValue.length; i++) {
            const maskChar = mask[i];
            const valueChar = cleanValue[valueIndex];

            if (maskChar === '0') {
                // Digit placeholder
                if (/\d/.test(valueChar)) {
                    maskedValue += valueChar;
                    valueIndex++;
                } else {
                    break;
                }
            } else if (maskChar === 'A') {
                // Letter placeholder
                if (/[A-Za-z]/.test(valueChar)) {
                    maskedValue += valueChar.toUpperCase();
                    valueIndex++;
                } else {
                    break;
                }
            } else {
                // Literal character (separator)
                maskedValue += maskChar;
            }
        }

        return maskedValue;
    }

    /**
     * Remove mask from document value
     */
    removeMask(value: string): string {
        return value.replaceAll(/[^\w]/g, '');
    }

    /**
     * Validate document based on country
     */
    validateDocument(value: string, country: CountryDocument): boolean {
        if (!country.documentValidation) {
            // No validation rule, just check if not empty
            return value.trim().length > 0;
        }

        return country.documentValidation.test(value);
    }

    /**
     * Apply phone mask to value
     */
    applyPhoneMask(value: string, country: CountryDocument): string {
        return this.applyMask(value, country.phoneMask);
    }

    /**
     * Validate phone based on country
     */
    validatePhone(value: string, country: CountryDocument): boolean {
        if (!country.phoneValidation) {
            // No validation rule, just check if not empty
            return value.trim().length > 0;
        }

        return country.phoneValidation.test(value);
    }

    /**
     * Search countries by name or code
     */
    searchCountries(searchTerm: string): CountryDocument[] {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return this.countries;
        }

        const term = searchTerm.toLowerCase().trim();
        return this.countries.filter(country =>
            country.name.toLowerCase().includes(term) ||
            country.code.toLowerCase().includes(term)
        );
    }
}

