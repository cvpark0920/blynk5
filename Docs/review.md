- 이 프로젝트는 베트남의 식당에서 테이블에 있는 QR로 주문 하는 서비스를 구성하는 3tier(고객, 식당 관리자, 플랫폼 관리자)로 구성된 플랫폼이야. 
- 현재 목 데이터를 적용해서 프론트 엔드만 개발 해 놓은 상황이야.
- 로컬에서 백엔드, DB 와 연동될 수 있게 개발을 진행 해야 해.
- 로컬에서 개발이 완료 되면 깃헙 ci/cd 를 통해 디지털 오션에 docker container로 배포를 진행 할 예정이야.
- 현재 코드 상태를 먼저 점검 해줘.
- 코드 최적화가 끝나면 로컬에서 실행 가능 하게 환경을 설정 해줘.


인증 시스템 먼저 개발 기획을 해 보자.
- 플랫폼 관리자 인증은 오로지 구글 로그인으로만 진행 해야해.
- cvpark0920@gmai.com 이 슈퍼 관리자 계정이야.
- 플랫폼 관리자에 등록된 상점은 활성화 되어 있을때 상점대표 구글 이메일로 로그인 할 수 있어.
- ShopOperator 앱 에서는 대표자가 구글 로그인을 한 후 직원과 포스 핀 번호를 등록 할 수 있어.
- 직원들은 로그인 화면에서 로그인 담당자를 선택하고 핀번호 입력으로 로그인을 진행 해야해.




# VietQR API Credentials from https://my.vietqr.io/
VIETQR_CLIENT_ID=4034ff8a-fa81-44b5-b2c7-7864721d0767
VIETQR_API_KEY=f7fe9670-cad1-4805-8028-2c9597a311e3



const { VietQR } = require('vietqr');

// Initialize VietQR with API keys from .env
const vietQR = new VietQR({
    clientID: process.env.VIETQR_CLIENT_ID,
    apiKey: process.env.VIETQR_API_KEY,
});


// API Endpoint to generate QR Code using the VietQR library
app.post('/api/generate-qr', async (req, res) => {
    const {
        bankId,
        accountNo,
        accountName,
        amount,
        memo
    } = req.body;

    if (!bankId || !accountNo) {
        return res.status(400).json({ error: 'Bank ID and Account Number are required.' });
    }

    try {
        // const qrDataURL = await vietQR.genQRCodeBase64({
        //     bank: bankId,
        //     accountNumber: accountNo,
        //     accountName: accountName,
        //     amount: amount ? amount.toString() : undefined,
        //     memo: memo,
        //     template: 'KzSd83k' // Restored template option
        // });

        // res.json({ qrDataURL: qrDataURL.data.data.qrDataURL });

        let link = await vietQR.genQuickLink({
            bank: bankId,
            accountNumber: accountNo,
            accountName: accountName,
            amount: amount ? amount.toString() : undefined,
            memo: memo,
            template: 'KzSd83k',
            media: '.jpg'
        });

        // console.log(link);
        res.json(link);

        // let link = vietQR.genQuickLink({
        //     bank: '970415',
        //     accountName: 'QUY VAC XIN PHONG CHONG COVID',
        //     accountNumber: '113366668888',
        //     amount: '79000',
        //     memo: 'Ung Ho Quy Vac Xin',
        //     template: 'compact',
        //     media: '.jpg'
        // });
        // console.log(link);
        // res.json(link);
    } catch (error) {
        console.error('Error generating QR code:', error.message);
        res.status(500).json({ error: 'Failed to generate QR code image.', details: error.message });
    }
});



환경 변수 파일들 상태 체크 하고 현재 로컬에 실행중인 이 프로젝트 관련 컨테이너와 이미지들 깨끗히 정리하고 처음 부터 다시 프로덕션 환경 테스트 진행 해줘.