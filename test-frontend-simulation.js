// Simular exactamente lo que hace el frontend
const axios = require('axios');

// Configurar axios como lo hace el frontend
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Simular el token que debería tener el frontend
const jwt = require('jsonwebtoken');
const adminToken = jwt.sign(
  { userId: '688ae3670031bee7e1534808' },
  'your-super-secret-jwt-key-change-this-in-production',
  { expiresIn: '1h' }
);

// Agregar interceptor de request como en el frontend
apiClient.interceptors.request.use(
  (config) => {
    // Simular que el token viene del localStorage
    const token = adminToken; // En el frontend sería: localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📤 Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: {
        Authorization: config.headers.Authorization ? config.headers.Authorization.substring(0, 30) + '...' : 'No token',
        'Content-Type': config.headers['Content-Type']
      }
    });
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Agregar interceptor de response como en el frontend
apiClient.interceptors.response.use(
  (response) => {
    console.log('📥 Response:', {
      status: response.status,
      statusText: response.statusText,
      dataType: typeof response.data,
      hasData: !!response.data,
      success: response.data?.success,
      dataLength: response.data?.data?.length
    });
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

// Simular la llamada exacta del frontend
async function simulateFrontendCall() {
  try {
    console.log('🎭 Simulando llamada del frontend...');
    console.log('🔑 Token generado:', adminToken.substring(0, 30) + '...');
    
    // Esta es la llamada exacta que hace specialCodesService.getAllSpecialCodes()
    const response = await apiClient.get('/admin/special-codes', {
      params: {} // filtros vacíos como en el frontend
    });
    
    console.log('\n✅ ÉXITO - Datos recibidos:');
    console.log('📊 Response.data:', {
      success: response.data.success,
      message: response.data.message,
      dataExists: !!response.data.data,
      dataType: typeof response.data.data,
      dataLength: Array.isArray(response.data.data) ? response.data.data.length : 'No es array',
      firstItem: response.data.data?.[0] ? {
        id: response.data.data[0]._id,
        type: response.data.data[0].type,
        userId: response.data.data[0].userId?._id,
        userName: response.data.data[0].userId?.fullName,
        referralCode: response.data.data[0].referralCode,
        isActive: response.data.data[0].isActive
      } : 'No hay primer item'
    });
    
    // Simular lo que hace el frontend con los datos
    const specialCodesData = response.data.data || [];
    console.log('\n🔄 Procesando datos como el frontend...');
    console.log('📋 Códigos especiales procesados:', specialCodesData.length);
    
    if (specialCodesData.length > 0) {
      console.log('\n📝 Detalles de cada código:');
      specialCodesData.forEach((code, index) => {
        console.log(`  ${index + 1}. ${code.type} - ${code.referralCode} (${code.isActive ? 'Activo' : 'Inactivo'})`);
        console.log(`     Usuario: ${code.userId?.fullName || 'Sin usuario'} (${code.userId?.email || 'Sin email'})`);
      });
    } else {
      console.log('⚠️  Array de códigos está vacío');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR en simulación:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

simulateFrontendCall();