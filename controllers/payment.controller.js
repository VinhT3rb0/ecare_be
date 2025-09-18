const crypto = require('crypto');
const Invoice = require('../models/invoice.model');
const Appointment = require('../models/appointment.model');
const Payment = require('../models/payment.model');
const Medicine = require('../models/medicine.model');
const https = require("https");
const InvoiceMedicine = require('../models/invoice_medicine.model');
const MOMO_PARTNER_CODE = (process.env.MOMO_PARTNER_CODE).trim() || 'MOMO';
const MOMO_ACCESS_KEY = (process.env.MOMO_ACCESS_KEY).trim() || '';
const MOMO_SECRET_KEY = (process.env.MOMO_SECRET_KEY).trim() || '';
const MOMO_ENDPOINT = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
const MOMO_RETURN_URL = process.env.MOMO_RETURN_URL || 'http://localhost:3000/management/payment/momo/return';
const MOMO_IPN_URL = process.env.MOMO_IPN_URL;
function signMomo(fields) {
    const raw =
        `accessKey=${fields.accessKey}` +
        `&amount=${fields.amount}` +
        `&extraData=${fields.extraData}` +
        `&ipnUrl=${fields.ipnUrl}` +
        `&orderId=${fields.orderId}` +
        `&orderInfo=${fields.orderInfo}` +
        `&partnerCode=${fields.partnerCode}` +
        `&redirectUrl=${fields.redirectUrl}` +
        `&requestId=${fields.requestId}` +
        `&requestType=${fields.requestType}`;
    return crypto.createHmac("sha256", MOMO_SECRET_KEY)
        .update(raw)
        .digest("hex");
}


exports.createMomoPayment = async (req, res) => {
    try {
        const { invoice_id, amount } = req.body;
        const invoice = await Invoice.findByPk(invoice_id);
        if (!invoice) return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
        // const amount = String(Math.round(Number(invoice.total_amount)));
        const orderId = `${MOMO_PARTNER_CODE}-${invoice_id}-${Date.now()}`;
        const requestId = orderId;
        const orderInfo = `Thanh toan hoa don`;
        const requestType = 'payWithMethod';
        const extraData = '';
        const paymentCode = 'T8Qii53fAXyUftPV3m9ysyRhEanUs9KlOPfHgpMR0ON50U10Bh+vZdpJU7VY4z+Z2y77fJHkoDc69scwwzLuW5MzeUKTwPo3ZMaB29imm6YulqnWfTkgzqRaion+EuD7FN9wZ4aXE1+mRt0gHsU193y+yxtRgpmY7SDMU9hCKoQtYyHsfFR5FUAOAKMdw2fzQqpToei3rnaYvZuYaxolprm9+/+WIETnPUDlxCYOiw7vPeaaYQQH0BF0TxyU3zu36ODx980rJvPAgtJzH1gUrlxcSS1HQeQ9ZaVM1eOK/jl8KJm6ijOwErHGbgf/hVymUQG65rHU2MWz9U8QUjvDWA==';
        const payload = {
            accessKey: MOMO_ACCESS_KEY,
            amount,
            extraData,
            ipnUrl: MOMO_IPN_URL,
            orderId,
            orderInfo,
            partnerCode: MOMO_PARTNER_CODE,
            redirectUrl: `http://localhost:3000/management/payment/${invoice_id}/momo/return`,
            requestId,
            requestType,
        };


        const signature = signMomo(payload);

        const requestBody = JSON.stringify({
            partnerCode: MOMO_PARTNER_CODE,
            partnerName: 'Ecare',
            storeId: 'EcareStore',
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl: `http://localhost:3000/management/payment/${invoice_id}/momo/return`,
            ipnUrl: MOMO_IPN_URL,
            lang: 'vi',
            requestType,
            autoCapture: true,
            extraData,
            paymentCode,
            orderGroupId: '',
            signature,
        });

        const url = new URL(MOMO_ENDPOINT);
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
            },
        };

        const momoRes = await new Promise((resolve, reject) => {
            const r = https.request(options, (resp) => {
                let data = '';
                resp.on('data', (chunk) => (data += chunk));
                resp.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                });
            });
            r.on('error', reject);
            r.write(requestBody);
            r.end();
        });

        if (momoRes.resultCode !== 0) {
            return res.status(400).json({ message: momoRes.message || 'Tạo thanh toán MoMo thất bại', data: momoRes });
        }

        // MoMo trả về payUrl, deeplink, qrCodeUrl (tùy loại)
        return res.json({ payUrl: momoRes.payUrl, deeplink: momoRes.deeplink, qrCodeUrl: momoRes.qrCodeUrl, orderId });
    } catch (err) {
        console.error('createMomoPayment error:', err);
        res.status(500).json({ message: 'Lỗi tạo thanh toán MoMo', error: err.message });
    }
};

function verifyMomoSignature(params) {
    const raw =
        `accessKey=${MOMO_ACCESS_KEY}` +
        `&amount=${params.amount}` +
        `&extraData=${params.extraData}` +
        `&message=${params.message}` +
        `&orderId=${params.orderId}` +
        `&orderInfo=${params.orderInfo}` +
        `&orderType=${params.orderType}` +
        `&partnerCode=${params.partnerCode}` +
        `&payType=${params.payType}` +
        `&requestId=${params.requestId}` +
        `&responseTime=${params.responseTime}` +
        `&resultCode=${params.resultCode}` +
        `&transId=${params.transId}`;

    const sig = crypto.createHmac('sha256', MOMO_SECRET_KEY)
        .update(raw)
        .digest('hex');

    return sig === params.signature;
}

async function savePaymentRecord(invoiceId, method, transactionId) {
    try {
        if (!invoiceId || !method) return;
        const exists = transactionId
            ? await Payment.findOne({ where: { invoice_id: invoiceId, transaction_id: String(transactionId) } })
            : null;
        if (!exists) {
            await Payment.create({
                invoice_id: invoiceId,
                method,
                transaction_id: transactionId ? String(transactionId) : null,
                paid_at: new Date(),
            });
        }
    } catch (e) {
        console.error('savePaymentRecord error:', e);
    }
}


exports.momoReturn = async (req, res) => {
    try {
        const q = { ...req.query };
        const okSig = q.signature ? verifyMomoSignature(q) : true;
        let invoiceId = Number(String(q.orderId || '').split('-')[1]);
        if (!invoiceId || Number.isNaN(invoiceId)) {
            const onlyDigits = String(q.orderId || '').replace(/\D/g, '');
            if (onlyDigits.length > 13) {
                invoiceId = Number(onlyDigits.slice(0, -13));
            }
        }
        if (!okSig) return res.status(400).json({ message: 'Chữ ký không hợp lệ' });
        if (String(q.resultCode) === '0') {
            if (invoiceId) {
                await Invoice.update({ status: 'paid', payment_method: 'MoMo' }, { where: { id: invoiceId } });
                const inv = await Invoice.findByPk(invoiceId, {
                    include: [{
                        model: InvoiceMedicine,
                        as: 'invoiceMedicines'
                    }]
                });
                if (inv?.appointment_id) {
                    await Appointment.update({ status: 'completed' }, { where: { id: inv.appointment_id } });
                }
                await savePaymentRecord(invoiceId, 'MoMo', q.transId);
                if (inv?.invoiceMedicines && inv.invoiceMedicines.length > 0) {
                    for (const im of inv.invoiceMedicines) {
                        const med = await Medicine.findByPk(im.medicine_id);
                        if (med && med.stock_quantity >= im.quantity) {
                            med.stock_quantity -= im.quantity;
                            await med.save();
                        }
                    }
                }
            }
            return res.json({ message: 'Thanh toán MoMo thành công', data: { invoice_id: invoiceId } });
        }
        return res.status(400).json({ message: 'Thanh toán MoMo thất bại', code: q.resultCode });
    } catch (err) {
        console.error('momoReturn error:', err);
        res.status(500).json({ message: 'Lỗi xử lý return MoMo', error: err.message });
    }
};

exports.momoIpn = async (req, res) => {
    try {
        const body = { ...req.body };
        const okSig = body.signature ? verifyMomoSignature(body) : true;
        let invoiceId = Number(String(body.orderId || '').split('-')[1]);
        if (!invoiceId || Number.isNaN(invoiceId)) {
            const onlyDigits = String(body.orderId || '').replace(/\D/g, '');
            if (onlyDigits.length > 13) {
                invoiceId = Number(onlyDigits.slice(0, -13));
            }
        }
        if (!okSig) return res.status(400).json({ message: 'Invalid signature' });
        if (String(body.resultCode) === '0') {
            if (invoiceId) {
                await Invoice.update({ status: 'paid', payment_method: 'MoMo' }, { where: { id: invoiceId } });
                const inv = await Invoice.findByPk(invoiceId);
                if (inv?.appointment_id) {
                    await Appointment.update({ status: 'completed' }, { where: { id: inv.appointment_id } });
                }
                await savePaymentRecord(invoiceId, 'MoMo', body.transId);
            }
            return res.json({ message: 'Confirm Success' });
        }
        return res.json({ message: 'Confirm Fail' });
    } catch (err) {
        console.error('momoIpn error:', err);
        res.status(500).json({ message: 'Unknown error' });
    }
};


