const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Conectar a MongoDB
const connectDB = async () => {
  try {
    const mongoUri = 'mongodb+srv://growx04:XIpmaH7nzwaOnDSK@cluster0.nufwbrc.mongodb.net/growx5?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Definir esquemas básicos
const SpecialCodeSchema = new mongoose.Schema({
  codeType: String,
  code: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCode: String,
  isActive: Boolean,
  commissionConfig: Object,
  statistics: Object,
  commissionHistory: Array,
  metadata: Object,
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  email: String,
  fullName: String,
  isSpecialUser: Boolean,
  specialUserType: String,
  specialCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpecialCode' },
  referralCode: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const SpecialCode = mongoose.model('SpecialCode', SpecialCodeSchema);
const User = mongoose.model('User', UserSchema);

const checkSpecialCodes = async () => {
  try {
    console.log('\n🔍 Verificando códigos especiales en MongoDB Atlas...');
    
    // Buscar códigos especiales
    const specialCodes = await SpecialCode.find({}).populate('userId', 'email fullName referralCode');
    console.log(`\n📊 Total de códigos especiales encontrados: ${specialCodes.length}`);
    
    if (specialCodes.length > 0) {
      console.log('\n📋 Códigos especiales encontrados:');
      specialCodes.forEach((code, index) => {
        console.log(`${index + 1}. ID: ${code._id}`);
        console.log(`   Tipo: ${code.codeType}`);
        console.log(`   Código: ${code.code}`);
        console.log(`   Activo: ${code.isActive}`);
        console.log(`   Usuario: ${code.userId?.email || 'No asignado'}`);
        console.log(`   Fecha creación: ${code.createdAt}`);
        console.log('   ---');
      });
    }
    
    // Buscar usuarios especiales
    console.log('\n🔍 Verificando usuarios especiales...');
    const specialUsers = await User.find({ isSpecialUser: true });
    console.log(`\n👥 Total de usuarios especiales encontrados: ${specialUsers.length}`);
    
    if (specialUsers.length > 0) {
      console.log('\n📋 Usuarios especiales encontrados:');
      specialUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nombre: ${user.fullName}`);
        console.log(`   Tipo especial: ${user.specialUserType}`);
        console.log(`   Código referido: ${user.referralCode}`);
        console.log(`   Estado: ${user.status}`);
        console.log(`   Fecha creación: ${user.createdAt}`);
        console.log('   ---');
      });
    }
    
    // Verificar usuarios con activación de reportes
    console.log('\n🔍 Verificando usuarios con activación de reportes...');
    const usersWithReports = await User.find({ 
      $or: [
        { 'features.reports': true },
        { 'packageFeatures.reports': true },
        { 'activeFeatures.reports': true }
      ]
    });
    console.log(`\n📊 Usuarios con reportes activados: ${usersWithReports.length}`);
    
    if (usersWithReports.length > 0) {
      console.log('\n📋 Usuarios con reportes:');
      usersWithReports.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Nombre: ${user.fullName}`);
        console.log(`   Es especial: ${user.isSpecialUser}`);
        console.log(`   Tipo especial: ${user.specialUserType || 'N/A'}`);
        console.log('   ---');
      });
    }
    
  } catch (error) {
    console.error('❌ Error verificando códigos especiales:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  }
};

const main = async () => {
  await connectDB();
  await checkSpecialCodes();
};

main().catch(console.error);