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









베트남 호치민에서 활동하고 있는 배드민턴 클럽 회원 모집 포스터를 아래 내용을 근거로 해서 만들어줘.
포스터에 적용될 이미지는 젊고 섹시하고 모던한 실사 이미지로 만들어줘.

- 제목 : 2026년 KBC 배드민턴 클럽 회원 모집
- 특징
  - 레슨클래스 운영 / 대한민국 엘리트 선수 출신 코치 직접 레슨 / 친목 위주의 즐거운 운동
  - 레벨별 매칭 시스템
  - 정기적인 친목모임
  - 초보자(초심) 기초 교육 제공
- 운동장소
  - 107 Đường Nguyễn Văn Linh, Tân Thuận Tây, Quận 7, Thành phố Hồ Chí Minh
  - ECO 배드민턴 코트장
- 운동일시
  - 매주 화요일, 목요일 저녘 19시 ~ 22시
  - 매주 일요일 오후 14시 ~ 17시
- 모집대상
  - 초보자 부터 상급자 까지 모두 환영
  - 한국인, 베트남인, 모든 외국인 환영
- 준비물
  - 실내용 운동화
  - 운동복
  - 배드민턴 라켓(초기 대여 가능)
  - 수건
- 월 회비
  - 800,000VND
- 가입 연락처
  - 전화: 0329037528
  - 카카오톡
    - 담당: cvpark0920
    - 오픈채팅방: https://open.kakao.com/o/pMIYslbi


- geminiapi key
  - AIzaSyAb80EpHQW5txMMi6kmsRq_YcdHiUJLQdQ




https://okchiken7.localhost/shop 현재 상점앱은 https 가 적용되고 포트가 80번으로 동작 하고 있고 관리자 앱은 http://admin.localhost:3000/admin 이렇게 되어 있고 고객앱은 http://okchiken7.localhost:3000/customer/table/1 이렇게 되어 있는데 url 형식을 일관되게 통일을 해야 하는건가?



신메뉴 출시 할인
양념치킨이 새로 런칭 했습니다. 맥주와 함께 세트 할인 중 이예요.

