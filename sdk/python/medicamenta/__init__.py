"""
🔵 Medicamenta.me Python SDK

Official SDK for the Medicamenta.me Public API

Example:
    >>> from medicamenta import MedicamentaClient
    >>> client = MedicamentaClient(api_key='YOUR_API_KEY')
    >>> patient = client.patients.create(
    ...     name='João Silva',
    ...     date_of_birth='1980-05-15'
    ... )
"""

import requests
from typing import Optional, Dict, List, Any
from datetime import datetime
import hmac
import hashlib


class MedicamentaError(Exception):
    """Base exception for Medicamenta SDK"""
    pass


class MedicamentaClient:
    """Main client for Medicamenta.me API"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        access_token: Optional[str] = None,
        base_url: str = 'https://us-central1-medicamenta-app.cloudfunctions.net/api',
        timeout: int = 30
    ):
        """
        Initialize Medicamenta client
        
        Args:
            api_key: API key for authentication
            access_token: OAuth access token for authentication
            base_url: API base URL
            timeout: Request timeout in seconds
        """
        if not api_key and not access_token:
            raise ValueError('Either api_key or access_token must be provided')
        
        self.api_key = api_key
        self.access_token = access_token
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        
        # Set authentication headers
        if self.api_key:
            self.session.headers['X-API-Key'] = self.api_key
        elif self.access_token:
            self.session.headers['Authorization'] = f'Bearer {self.access_token}'
        
        self.session.headers['Content-Type'] = 'application/json'
        
        # Initialize resource managers
        self.patients = PatientsResource(self)
        self.medications = MedicationsResource(self)
        self.adherence = AdherenceResource(self)
        self.reports = ReportsResource(self)
        self.webhooks = WebhooksResource(self)
    
    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None
    ) -> Any:
        """Make authenticated HTTP request"""
        url = f'{self.base_url}{path}'
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response.content else {}
            error_msg = error_data.get('error', {}).get('message', str(e))
            raise MedicamentaError(f'API Error: {error_msg}') from e
        except requests.exceptions.RequestException as e:
            raise MedicamentaError(f'Request failed: {str(e)}') from e


class PatientsResource:
    """Patients API resource"""
    
    def __init__(self, client: MedicamentaClient):
        self.client = client
    
    def create(self, **kwargs) -> Dict[str, Any]:
        """
        Create a new patient
        
        Args:
            name (str): Patient name (required)
            date_of_birth (str): Date of birth in YYYY-MM-DD format (required)
            email (str): Email address
            phone (str): Phone number
            gender (str): Gender (M, F, Other)
            medical_conditions (list): List of medical conditions
            allergies (list): List of allergies
        
        Returns:
            dict: Created patient data
        """
        return self.client._request('POST', '/v1/patients', json=kwargs)
    
    def list(
        self,
        limit: int = 20,
        offset: int = 0,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List patients
        
        Args:
            limit: Maximum number of results
            offset: Pagination offset
            status: Filter by status (active, inactive, deleted)
            search: Search query
        
        Returns:
            dict: Response with 'data' and 'pagination' keys
        """
        params = {
            'limit': limit,
            'offset': offset,
            'status': status,
            'search': search
        }
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        return self.client._request('GET', '/v1/patients', params=params)
    
    def get(self, patient_id: str) -> Dict[str, Any]:
        """Get patient by ID"""
        return self.client._request('GET', f'/v1/patients/{patient_id}')
    
    def update(self, patient_id: str, **kwargs) -> Dict[str, Any]:
        """Update patient"""
        return self.client._request('PATCH', f'/v1/patients/{patient_id}', json=kwargs)
    
    def delete(self, patient_id: str, hard: bool = False) -> None:
        """
        Delete patient
        
        Args:
            patient_id: Patient ID
            hard: If True, permanently delete. If False, soft delete.
        """
        params = {'hard': 'true' if hard else 'false'}
        self.client._request('DELETE', f'/v1/patients/{patient_id}', params=params)


class MedicationsResource:
    """Medications API resource"""
    
    def __init__(self, client: MedicamentaClient):
        self.client = client
    
    def create(self, **kwargs) -> Dict[str, Any]:
        """
        Create medication
        
        Args:
            patient_id (str): Patient ID (required)
            name (str): Medication name (required)
            dosage (str): Dosage (required)
            frequency (str): Frequency (daily, twice_daily, etc.) (required)
            times (list): List of times in HH:MM format (required)
            instructions (str): Instructions
        
        Returns:
            dict: Created medication data
        """
        return self.client._request('POST', '/v1/medications', json=kwargs)
    
    def list(
        self,
        patient_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """List medications"""
        params = {
            'patientId': patient_id,
            'status': status,
            'limit': limit,
            'offset': offset
        }
        params = {k: v for k, v in params.items() if v is not None}
        return self.client._request('GET', '/v1/medications', params=params)
    
    def get(self, medication_id: str) -> Dict[str, Any]:
        """Get medication by ID"""
        return self.client._request('GET', f'/v1/medications/{medication_id}')
    
    def update(self, medication_id: str, **kwargs) -> Dict[str, Any]:
        """Update medication"""
        return self.client._request('PATCH', f'/v1/medications/{medication_id}', json=kwargs)
    
    def delete(self, medication_id: str) -> None:
        """Delete medication (soft delete)"""
        self.client._request('DELETE', f'/v1/medications/{medication_id}')


class AdherenceResource:
    """Adherence API resource"""
    
    def __init__(self, client: MedicamentaClient):
        self.client = client
    
    def get(
        self,
        patient_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        medication_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get adherence metrics
        
        Args:
            patient_id: Patient ID
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            medication_id: Filter by medication ID
        
        Returns:
            dict: Adherence metrics
        """
        params = {
            'startDate': start_date,
            'endDate': end_date,
            'medicationId': medication_id
        }
        params = {k: v for k, v in params.items() if v is not None}
        return self.client._request('GET', f'/v1/adherence/{patient_id}', params=params)
    
    def history(
        self,
        patient_id: str,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
        medication_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get dose history"""
        params = {
            'limit': limit,
            'offset': offset,
            'status': status,
            'medicationId': medication_id
        }
        params = {k: v for k, v in params.items() if v is not None}
        return self.client._request('GET', f'/v1/adherence/{patient_id}/history', params=params)
    
    def confirm(
        self,
        patient_id: str,
        medication_id: str,
        scheduled_time: str,
        taken_at: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Confirm dose taken
        
        Args:
            patient_id: Patient ID
            medication_id: Medication ID
            scheduled_time: Scheduled time (ISO format or datetime)
            taken_at: Actual time taken (ISO format or datetime)
            notes: Optional notes
        
        Returns:
            dict: Confirmation result
        """
        data = {
            'patientId': patient_id,
            'medicationId': medication_id,
            'scheduledTime': scheduled_time,
            'takenAt': taken_at,
            'notes': notes
        }
        data = {k: v for k, v in data.items() if v is not None}
        return self.client._request('POST', '/v1/adherence/confirm', json=data)


class ReportsResource:
    """Reports API resource"""
    
    def __init__(self, client: MedicamentaClient):
        self.client = client
    
    def adherence(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        patient_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get adherence report"""
        params = {
            'startDate': start_date,
            'endDate': end_date,
            'patientId': patient_id
        }
        params = {k: v for k, v in params.items() if v is not None}
        return self.client._request('GET', '/v1/reports/adherence', params=params)
    
    def compliance(self) -> Dict[str, Any]:
        """Get compliance report"""
        return self.client._request('GET', '/v1/reports/compliance')
    
    def export(self, report_type: str, format: str = 'json') -> Dict[str, Any]:
        """
        Export report
        
        Args:
            report_type: Type of report (adherence, compliance)
            format: Export format (json, csv)
        
        Returns:
            dict: Export data
        """
        data = {
            'reportType': report_type,
            'format': format
        }
        return self.client._request('POST', '/v1/reports/export', json=data)


class WebhooksResource:
    """Webhooks API resource"""
    
    def __init__(self, client: MedicamentaClient):
        self.client = client
    
    def create(self, url: str, events: List[str], secret: Optional[str] = None) -> Dict[str, Any]:
        """
        Create webhook subscription
        
        Args:
            url: Webhook URL
            events: List of event types to subscribe to
            secret: Optional secret for signature verification
        
        Returns:
            dict: Created webhook data
        """
        data = {
            'url': url,
            'events': events,
            'secret': secret
        }
        return self.client._request('POST', '/v1/webhooks', json=data)
    
    def list(self) -> Dict[str, Any]:
        """List webhooks"""
        return self.client._request('GET', '/v1/webhooks')
    
    def get(self, webhook_id: str) -> Dict[str, Any]:
        """Get webhook by ID"""
        return self.client._request('GET', f'/v1/webhooks/{webhook_id}')
    
    def delete(self, webhook_id: str) -> None:
        """Delete webhook"""
        self.client._request('DELETE', f'/v1/webhooks/{webhook_id}')
    
    def test(self, webhook_id: str) -> Dict[str, Any]:
        """Test webhook delivery"""
        return self.client._request('POST', f'/v1/webhooks/{webhook_id}/test')


def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """
    Verify webhook signature
    
    Args:
        payload: Raw request body as string
        signature: Value from X-Webhook-Signature header
        secret: Webhook secret
    
    Returns:
        bool: True if signature is valid
    """
    try:
        parts = signature.split(',')
        timestamp = parts[0].split('=')[1]
        received_hash = parts[1].split('=')[1]
        
        # Compute expected hash
        message = f'{timestamp}.{payload}'
        expected_hash = hmac.new(
            secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(received_hash, expected_hash)
    except (IndexError, ValueError):
        return False
