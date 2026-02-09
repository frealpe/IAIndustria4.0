import React, { useState, useEffect } from 'react';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CButton,
    CTable,
    CTableHead,
    CTableBody,
    CTableRow,
    CTableHeaderCell,
    CTableDataCell,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CForm,
    CFormInput,
    CFormLabel,
    CFormTextarea,
    CBadge,
    CSpinner
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons';
import ControlService from '../../service/control/control.service';

const DeviceManagement = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [formData, setFormData] = useState({
        device_uid: '',
        mac_address: '',
        name: '',
        description: ''
    });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        setLoading(true);
        const result = await ControlService.getAllDevices();
        if (result.ok) {
            setDevices(result.data);
        } else {
            setError('Error cargando dispositivos');
        }
        setLoading(false);
    };

    const handleOpenModal = (device = null) => {
        if (device) {
            setEditingDevice(device);
            setFormData({
                device_uid: device.device_uid,
                mac_address: device.mac_address,
                name: device.name || '',
                description: device.description || ''
            });
        } else {
            setEditingDevice(null);
            setFormData({
                device_uid: '',
                mac_address: '',
                name: '',
                description: ''
            });
        }
        setError(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingDevice(null);
        setFormData({
            device_uid: '',
            mac_address: '',
            name: '',
            description: ''
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            let result;
            if (editingDevice) {
                result = await ControlService.updateDevice(editingDevice.id, formData);
            } else {
                result = await ControlService.createDevice(formData);
            }

            if (result.ok) {
                handleCloseModal();
                loadDevices();
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Error guardando dispositivo');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este dispositivo?')) {
            return;
        }

        const result = await ControlService.deleteDevice(id);
        if (result.ok) {
            loadDevices();
        } else {
            alert('Error eliminando dispositivo: ' + result.error);
        }
    };

    const formatMacAddress = (mac) => {
        if (!mac) return '';
        // Ensure proper MAC format XX:XX:XX:XX:XX:XX
        return mac.toUpperCase().match(/.{1,2}/g)?.join(':') || mac;
    };

    return (
        <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>📱 Gestión de Dispositivos</strong>
                <CButton color="primary" size="sm" onClick={() => handleOpenModal()}>
                    <CIcon icon={cilPlus} className="me-1" />
                    Agregar Dispositivo
                </CButton>
            </CCardHeader>
            <CCardBody>
                {loading ? (
                    <div className="text-center py-4">
                        <CSpinner color="primary" />
                        <p className="mt-2">Cargando dispositivos...</p>
                    </div>
                ) : (
                    <CTable hover responsive>
                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell>UID</CTableHeaderCell>
                                <CTableHeaderCell>MAC Address</CTableHeaderCell>
                                <CTableHeaderCell>Nombre</CTableHeaderCell>
                                <CTableHeaderCell>Descripción</CTableHeaderCell>
                                <CTableHeaderCell>Estado</CTableHeaderCell>
                                <CTableHeaderCell>Acciones</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {devices.length === 0 ? (
                                <CTableRow>
                                    <CTableDataCell colSpan="6" className="text-center text-muted">
                                        No hay dispositivos registrados
                                    </CTableDataCell>
                                </CTableRow>
                            ) : (
                                devices.map(device => (
                                    <CTableRow key={device.id}>
                                        <CTableDataCell>
                                            <code>{device.device_uid}</code>
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            <code>{formatMacAddress(device.mac_address)}</code>
                                        </CTableDataCell>
                                        <CTableDataCell>{device.name || '-'}</CTableDataCell>
                                        <CTableDataCell>
                                            <small>{device.description || '-'}</small>
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            {device.is_active ? (
                                                <CBadge color="success">Activo</CBadge>
                                            ) : (
                                                <CBadge color="secondary">Inactivo</CBadge>
                                            )}
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            <div className="d-flex gap-2">
                                                <CIcon
                                                    icon={cilPencil}
                                                    size="lg"
                                                    className="text-warning"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleOpenModal(device)}
                                                    title="Editar"
                                                />
                                                <CIcon
                                                    icon={cilTrash}
                                                    size="lg"
                                                    className="text-danger"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleDelete(device.id)}
                                                    title="Eliminar"
                                                />
                                            </div>
                                        </CTableDataCell>
                                    </CTableRow>
                                ))
                            )}
                        </CTableBody>
                    </CTable>
                )}
            </CCardBody>

            {/* Modal for Add/Edit */}
            <CModal visible={showModal} onClose={handleCloseModal}>
                <CModalHeader>
                    <CModalTitle>
                        {editingDevice ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
                    </CModalTitle>
                </CModalHeader>
                <CForm onSubmit={handleSubmit}>
                    <CModalBody>
                        {error && (
                            <div className="alert alert-danger">{error}</div>
                        )}

                        <div className="mb-3">
                            <CFormLabel htmlFor="device_uid">UID del Dispositivo *</CFormLabel>
                            <CFormInput
                                type="text"
                                id="device_uid"
                                value={formData.device_uid}
                                onChange={(e) => setFormData({ ...formData, device_uid: e.target.value })}
                                required
                                disabled={!!editingDevice}
                                placeholder="ESP32XXXXXXXX"
                            />
                            <small className="text-muted">Identificador único del dispositivo</small>
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="mac_address">Dirección MAC *</CFormLabel>
                            <CFormInput
                                type="text"
                                id="mac_address"
                                value={formData.mac_address}
                                onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                                required
                                placeholder="XX:XX:XX:XX:XX:XX"
                            />
                            <small className="text-muted">Formato: AA:BB:CC:DD:EE:FF</small>
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="name">Nombre</CFormLabel>
                            <CFormInput
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Sensor Principal"
                            />
                        </div>

                        <div className="mb-3">
                            <CFormLabel htmlFor="description">Descripción</CFormLabel>
                            <CFormTextarea
                                id="description"
                                rows="3"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción opcional del dispositivo"
                            />
                        </div>
                    </CModalBody>
                    <CModalFooter>
                        <CButton color="secondary" onClick={handleCloseModal} disabled={saving}>
                            Cancelar
                        </CButton>
                        <CButton color="primary" type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <CSpinner size="sm" className="me-1" />
                                    Guardando...
                                </>
                            ) : (
                                editingDevice ? 'Actualizar' : 'Crear'
                            )}
                        </CButton>
                    </CModalFooter>
                </CForm>
            </CModal>
        </CCard>
    );
};

export default DeviceManagement;
