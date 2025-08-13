const axios = require('axios');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction.model');
const Wallet = require('../models/Wallet.model');

class BEP20Service {
  constructor() {
    this.bscScanApiKey = process.env.BSCSCAN_API_KEY;
    this.bscScanBaseUrl = 'https://api.bscscan.com/api';
    this.usdtContractAddress = '0x55d398326f99059fF775485246999027B3197955';
    this.requiredConfirmations = 3;
    this.fallbackMode = process.env.BSC_FALLBACK_MODE === 'true';
    
    // Validar que la API key esté configurada
    if (!this.bscScanApiKey || this.bscScanApiKey === 'YourBSCScanAPIKeyHere') {
      if (this.fallbackMode) {
        logger.warn('BSCSCAN_API_KEY not configured. Running in fallback mode for development.');
      } else {
        logger.warn('BSCSCAN_API_KEY not configured properly. BSC transaction verification will fail.');
      }
    }
  }

  /**
   * Verifica una transacción BEP20 usando BSCScan API
   * @param {string} txHash - Hash de la transacción
   * @param {string} toAddress - Dirección de destino esperada
   * @param {number} expectedAmount - Cantidad esperada en USDT
   * @returns {Object} Resultado de la verificación
   */
  async verifyTransaction(txHash, toAddress, expectedAmount) {
    try {
      logger.info(`Verificando transacción BEP20: ${txHash}`);

      // Modo fallback para desarrollo sin API key real
      if (this.fallbackMode && (!this.bscScanApiKey || this.bscScanApiKey === 'YourBSCScanAPIKeyHere')) {
        logger.info('Usando modo fallback para verificación BEP20 (desarrollo)');
        
        // Simular verificación exitosa para desarrollo
        if (txHash && txHash.length >= 10) {
          return {
            success: true,
            status: 'confirmed',
            confirmations: 6,
            requiredConfirmations: this.requiredConfirmations,
            amount: expectedAmount,
            toAddress: toAddress,
            txHash: txHash,
            blockNumber: '999999999',
            gasUsed: '21000',
            gasPrice: '5000000000',
            fallbackMode: true
          };
        } else {
          return {
            success: false,
            error: 'Hash de transacción inválido',
            status: 'invalid_hash'
          };
        }
      }

      // Obtener detalles de la transacción
      const txDetails = await this.getTransactionDetails(txHash);
      
      if (!txDetails) {
        return {
          success: false,
          error: 'Transacción no encontrada',
          status: 'not_found'
        };
      }

      // Verificar si es una transacción de USDT
      if (txDetails.to.toLowerCase() !== this.usdtContractAddress.toLowerCase()) {
        return {
          success: false,
          error: 'No es una transacción de USDT BEP20',
          status: 'invalid_token'
        };
      }

      // Decodificar los datos de la transacción para obtener destinatario y cantidad
      const transferData = this.decodeTransferData(txDetails.input);
      
      if (!transferData) {
        return {
          success: false,
          error: 'No se pudo decodificar la transacción',
          status: 'decode_error'
        };
      }

      // Verificar dirección de destino
      if (transferData.to.toLowerCase() !== toAddress.toLowerCase()) {
        return {
          success: false,
          error: 'Dirección de destino no coincide',
          status: 'wrong_address',
          details: {
            expected: toAddress,
            received: transferData.to
          }
        };
      }

      // Verificar cantidad (convertir de wei a USDT)
      const receivedAmount = this.weiToUsdt(transferData.value);
      const tolerance = 0.01; // Tolerancia de 0.01 USDT
      
      if (Math.abs(receivedAmount - expectedAmount) > tolerance) {
        return {
          success: false,
          error: 'Cantidad no coincide',
          status: 'wrong_amount',
          details: {
            expected: expectedAmount,
            received: receivedAmount
          }
        };
      }

      // Verificar confirmaciones
      const currentBlock = await this.getCurrentBlockNumber();
      const confirmations = currentBlock - parseInt(txDetails.blockNumber);
      
      const isConfirmed = confirmations >= this.requiredConfirmations;
      
      return {
        success: true,
        status: isConfirmed ? 'confirmed' : 'pending',
        confirmations,
        requiredConfirmations: this.requiredConfirmations,
        transaction: {
          hash: txHash,
          from: txDetails.from,
          to: transferData.to,
          amount: receivedAmount,
          blockNumber: txDetails.blockNumber,
          timestamp: new Date(parseInt(txDetails.timeStamp) * 1000),
          gasUsed: txDetails.gasUsed,
          gasPrice: txDetails.gasPrice
        }
      };

    } catch (error) {
      logger.error('Error verificando transacción BEP20:', error);
      return {
        success: false,
        error: 'Error interno del servidor',
        status: 'server_error'
      };
    }
  }

  /**
   * Obtiene los detalles de una transacción desde BSCScan
   */
  async getTransactionDetails(txHash) {
    try {
      const response = await axios.get(this.bscScanBaseUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: txHash,
          apikey: this.bscScanApiKey
        },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      logger.error('Error obteniendo detalles de transacción:', error);
      throw error;
    }
  }

  /**
   * Obtiene el número de bloque actual
   */
  async getCurrentBlockNumber() {
    try {
      const response = await axios.get(this.bscScanBaseUrl, {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: this.bscScanApiKey
        },
        timeout: 5000
      });

      return parseInt(response.data.result, 16);
    } catch (error) {
      logger.error('Error obteniendo número de bloque:', error);
      throw error;
    }
  }

  /**
   * Decodifica los datos de una transferencia ERC20/BEP20
   */
  decodeTransferData(input) {
    try {
      // Verificar que sea una función transfer (0xa9059cbb)
      if (!input.startsWith('0xa9059cbb')) {
        return null;
      }

      // Remover el selector de función (primeros 10 caracteres)
      const data = input.slice(10);
      
      // Extraer dirección de destino (32 bytes)
      const toAddress = '0x' + data.slice(24, 64);
      
      // Extraer valor (32 bytes)
      const value = '0x' + data.slice(64, 128);
      
      return {
        to: toAddress,
        value: value
      };
    } catch (error) {
      logger.error('Error decodificando datos de transferencia:', error);
      return null;
    }
  }

  /**
   * Convierte wei a USDT (6 decimales)
   */
  weiToUsdt(weiValue) {
    try {
      // Verificar si el valor es válido
      if (!weiValue || weiValue === 'Missing/Invalid API Key' || typeof weiValue === 'string') {
        throw new Error('Invalid wei value or API key not configured');
      }
      
      const wei = BigInt(weiValue);
      const divisor = BigInt(10 ** 18); // USDT tiene 18 decimales en BSC
      return Number(wei) / Number(divisor);
    } catch (error) {
      logger.error('Error converting wei to USDT:', error.message);
      throw new Error('Failed to convert wei to USDT: ' + error.message);
    }
  }

  /**
   * Monitorea transacciones pendientes
   */
  async monitorPendingTransactions() {
    try {
      logger.info('Iniciando monitoreo de transacciones BEP20 pendientes');

      // Obtener transacciones pendientes de BEP20
      const pendingTransactions = await Transaction.find({
        status: 'pending',
        'paymentDetails.network': 'BEP20',
        'paymentDetails.txHash': { $exists: true, $ne: null },
        expiresAt: { $gt: new Date() }
      });

      logger.info(`Encontradas ${pendingTransactions.length} transacciones BEP20 pendientes`);

      for (const transaction of pendingTransactions) {
        await this.processTransaction(transaction);
        // Esperar un poco entre verificaciones para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      logger.error('Error en monitoreo de transacciones:', error);
    }
  }

  /**
   * Procesa una transacción individual
   */
  async processTransaction(transaction) {
    try {
      const verification = await this.verifyTransaction(
        transaction.paymentDetails.txHash,
        transaction.paymentDetails.address,
        transaction.amount
      );

      if (verification.success) {
        if (verification.status === 'confirmed') {
          // Marcar transacción como completada
          await transaction.markAsCompleted({
            txHash: transaction.paymentDetails.txHash,
            confirmations: verification.confirmations,
            verifiedAt: new Date(),
            blockNumber: verification.transaction.blockNumber
          });

          logger.info(`Transacción BEP20 confirmada: ${transaction._id}`);
        } else {
          // Actualizar confirmaciones
          await transaction.updateConfirmations(verification.confirmations);
          logger.info(`Transacción BEP20 actualizada: ${transaction._id} (${verification.confirmations}/${verification.requiredConfirmations} confirmaciones)`);
        }
      } else if (verification.status === 'not_found') {
        // La transacción aún no se ha propagado
        logger.info(`Transacción BEP20 no encontrada aún: ${transaction._id}`);
      } else {
        // Error en la verificación
        await transaction.markAsFailed(verification.error);
        logger.warn(`Transacción BEP20 falló verificación: ${transaction._id} - ${verification.error}`);
      }

    } catch (error) {
      logger.error(`Error procesando transacción ${transaction._id}:`, error);
    }
  }

  /**
   * Obtiene el balance de una dirección
   */
  async getAddressBalance(address) {
    try {
      const response = await axios.get(this.bscScanBaseUrl, {
        params: {
          module: 'account',
          action: 'tokenbalance',
          contractaddress: this.usdtContractAddress,
          address: address,
          tag: 'latest',
          apikey: this.bscScanApiKey
        },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return this.weiToUsdt(response.data.result);
    } catch (error) {
      logger.error('Error obteniendo balance:', error);
      throw error;
    }
  }

  /**
   * Valida una dirección BEP20
   */
  isValidAddress(address) {
    // Validación estricta para direcciones BEP20 (formato Ethereum)
    const isValid = /^0x[a-fA-F0-9]{40}$/i.test(address);
    return isValid;
  }

  /**
   * Obtiene transacciones de una dirección
   */
  async getAddressTransactions(address, startBlock = 0, endBlock = 'latest') {
    try {
      const response = await axios.get(this.bscScanBaseUrl, {
        params: {
          module: 'account',
          action: 'tokentx',
          contractaddress: this.usdtContractAddress,
          address: address,
          startblock: startBlock,
          endblock: endBlock,
          sort: 'desc',
          apikey: this.bscScanApiKey
        },
        timeout: 15000
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: this.weiToUsdt(tx.value),
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        blockNumber: tx.blockNumber,
        confirmations: tx.confirmations
      }));
    } catch (error) {
      logger.error('Error obteniendo transacciones de dirección:', error);
      throw error;
    }
  }
}

module.exports = new BEP20Service();