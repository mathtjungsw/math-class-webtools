const P = (name, en, years, start, region, era, fields, story, scene, question, symbol = "∞") => ({
  name, en, years, start, region, era, fields, story, scene, question, symbol
});

const PEOPLE = [
  P("아메스", "Ahmes", "기원전 17세기경", -1650, "고대 이집트", "고대", ["산술", "기하"], "린드 수학 파피루스를 필사한 서기관입니다. 분수 계산과 토지 측량 문제를 통해 당시의 실용 수학을 오늘에 전했습니다.", "나일강의 범람 뒤 밭의 경계를 다시 재야 하는 서기관", "단위분수만으로 2/7을 나타내려면 어떻게 해야 할까요?", "𓂀"),
  P("바우다야나", "Baudhayana", "기원전 8~6세기경", -700, "인도", "고대", ["기하", "수론"], "제단을 정확한 모양과 넓이로 만들기 위한 술바수트라에 기하 규칙을 남겼습니다. 피타고라스 정리와 같은 관계도 서술되어 있습니다.", "서로 다른 모양의 제단을 같은 넓이로 바꾸어야 하는 설계자", "직사각형의 대각선 길이는 두 변과 어떤 관계가 있을까요?", "△"),
  P("피타고라스", "Pythagoras", "기원전 570년경–495년경", -570, "그리스·로마", "고대", ["기하", "수론", "음악"], "수와 도형, 음의 비율 사이에서 질서를 찾은 공동체를 이끌었습니다. 그의 이름을 딴 정리는 여러 문명에서 독립적으로 알려졌습니다.", "현의 길이를 바꾸며 소리가 조화로워지는 비율을 찾는 탐구자", "수와 음악은 어떻게 같은 비율로 설명될 수 있을까요?", "△"),
  P("테아노", "Theano", "기원전 6세기경", -550, "그리스·로마", "고대", ["수론", "철학"], "피타고라스 학파와 관련된 여성 철학자이자 수학자로 전해집니다. 다만 생애와 저작에 관한 기록은 후대 전승이 섞여 있어 신중히 살펴야 합니다.", "수와 조화에 관한 배움을 공동체 안에서 이어 가는 교사", "기록이 부족한 인물의 업적은 어떤 근거로 판단해야 할까요?", "φ"),
  P("유클리드", "Euclid", "기원전 3세기경", -300, "그리스·로마", "고대", ["기하", "논리", "수론"], "정의와 공리에서 출발해 명제를 증명하는 지식 체계를 《원론》에 정리했습니다. 수학을 ‘왜 참인지 설명하는 학문’으로 보여 준 인물입니다.", "몇 개의 약속만으로 수많은 도형의 성질을 증명하는 알렉산드리아의 교사", "평행선에 관한 공리를 바꾸면 어떤 기하가 생길까요?", "∵"),
  P("아르키메데스", "Archimedes", "기원전 287년경–212년경", -287, "그리스·로마", "고대", ["기하", "해석", "물리"], "도형을 잘게 나누어 넓이와 부피를 구하고, 지레와 부력의 원리를 수학으로 설명했습니다. 원주율도 정교하게 근사했습니다.", "원의 안팎에 다각형을 그려 원주율의 범위를 좁히는 발명가", "정확한 값을 모를 때 위아래에서 범위를 좁히는 방법은 왜 강력할까요?", "π"),
  P("류후이", "Liu Hui", "3세기", 225, "동아시아", "고대", ["기하", "산술", "해석"], "《구장산술》에 주석을 달아 계산 절차의 이유를 설명했습니다. 다각형으로 원을 채워 원주율을 근사하고 부피 공식의 논리를 탐구했습니다.", "원을 더 많은 변의 다각형으로 바꾸며 오차가 줄어드는 것을 확인하는 학자", "계산 방법만 아는 것과 그 이유를 설명하는 것은 어떻게 다를까요?", "割"),
  P("히파티아", "Hypatia", "약 355–415", 355, "고대 이집트", "고대", ["기하", "천문", "교육"], "알렉산드리아에서 수학과 천문학을 가르치고 고전 저작의 주석과 편집에 기여했습니다. 지식을 공개적으로 가르친 여성 학자의 상징적 인물입니다.", "복잡한 원뿔곡선을 학생에게 그림과 말로 설명하는 공개 강연자", "지식을 보존하고 가르치는 일도 새로운 발견만큼 중요할까요?", "☉"),
  P("조충지", "Zu Chongzhi", "429–500", 429, "동아시아", "고대", ["기하", "천문", "달력"], "원주율을 3.1415926과 3.1415927 사이로 좁히고 정밀한 달력을 만들었습니다. 계산과 관측을 함께 다룬 과학자입니다.", "수천 변의 다각형 계산을 반복하며 원주율의 자릿수를 좁혀 가는 관측자", "더 정확한 근삿값은 실제 달력과 측량을 어떻게 바꿀까요?", "密"),
  P("브라마굽타", "Brahmagupta", "598–약 668", 598, "인도", "중세", ["대수", "수론", "천문"], "0과 음수를 포함한 계산 규칙을 체계적으로 다루고, 이차방정식과 순환사각형의 넓이를 연구했습니다.", "빚과 재산이라는 비유로 음수와 양수의 계산을 설명하는 천문학자", "‘아무것도 없음’인 0이 어떻게 계산의 대상이 될 수 있을까요?", "0"),
  P("알콰리즈미", "Al-Khwarizmi", "약 780–약 850", 780, "이슬람권", "중세", ["대수", "산술", "천문"], "방정식을 푸는 절차를 정리한 저술로 대수학의 발전에 큰 영향을 주었습니다. 그의 이름은 ‘알고리즘’이라는 말의 뿌리가 되었습니다.", "상속과 거래 문제를 누구나 따라 할 수 있는 단계로 정리하는 학자", "복잡한 문제를 반복 가능한 절차로 바꾸면 무엇이 좋아질까요?", "x"),
  P("타비트 이븐 쿠라", "Thabit ibn Qurra", "826–901", 826, "이슬람권", "중세", ["기하", "수론", "천문"], "그리스 수학서를 번역·개정하고 우애수와 기하를 연구했습니다. 여러 언어와 학문을 연결한 번역가이자 수학자였습니다.", "오래된 수학서를 번역하면서 빠진 논증을 새로 채우는 연구자", "번역은 지식을 그대로 옮기는 일일까요, 새롭게 만드는 일일까요?", "∽"),
  P("알비루니", "Al-Biruni", "973–약 1050", 973, "이슬람권", "중세", ["삼각법", "측지", "천문"], "산의 높이와 지평선 각도를 이용해 지구의 크기를 추정했습니다. 문화와 언어를 넘나들며 측정과 비교를 중시했습니다.", "산꼭대기에서 지평선을 바라보며 지구 반지름을 계산하는 관측자", "직접 잴 수 없는 지구의 크기를 작은 각도로 어떻게 알 수 있을까요?", "⊕"),
  P("오마르 하이얌", "Omar Khayyam", "1048–1131", 1048, "이슬람권", "중세", ["대수", "기하", "달력"], "삼차방정식을 원뿔곡선의 교점으로 분류해 풀고 정교한 달력 제작에 참여했습니다. 시인으로도 널리 알려져 있습니다.", "두 곡선의 만나는 점으로 방정식의 답을 눈앞에 그리는 시인", "식을 그림으로 바꾸면 보이지 않던 해가 어떻게 드러날까요?", "∩"),
  P("피보나치", "Fibonacci", "약 1170–약 1240 이후", 1170, "유럽", "중세", ["산술", "수론", "수열"], "지중해 무역 세계에서 배운 인도-아라비아 숫자 체계를 유럽에 소개했습니다. 토끼 문제의 수열로도 유명합니다.", "서로 다른 숫자 표기법 가운데 계산하기 가장 편한 방법을 상인에게 설명하는 여행자", "숫자를 쓰는 방식이 바뀌면 계산과 사회는 어떻게 달라질까요?", "1,1"),
  P("마다바", "Madhava", "약 1340–약 1425", 1340, "인도", "중세", ["해석", "삼각법", "무한급수"], "케랄라 학파를 이끌며 삼각함수와 원주율을 무한급수로 나타냈습니다. 오차를 보정하는 방법도 함께 탐구했습니다.", "끝없이 이어지는 항을 더해 원주율에 가까워지는 계산을 하는 학자", "끝나지 않는 덧셈으로 어떻게 하나의 값을 정할 수 있을까요?", "∑"),
  P("알카시", "Jamshid al-Kashi", "약 1380–1429", 1380, "이슬람권", "중세", ["산술", "기하", "천문"], "십진분수 계산을 발전시키고 원주율을 매우 정밀하게 구했습니다. 사마르칸트 천문대의 거대한 관측 프로젝트에 참여했습니다.", "거대한 천문대에서 여러 계산자가 같은 자릿수를 검산하도록 조직하는 연구자", "정밀한 계산에서 사람들의 협업은 왜 중요할까요?", "."),
  P("카르다노", "Gerolamo Cardano", "1501–1576", 1501, "유럽", "르네상스", ["대수", "확률", "의학"], "삼차·사차방정식의 해법을 널리 알리고 도박 경험을 바탕으로 확률적 사고를 기록했습니다. 파란만장한 삶 속에서 수학과 의학을 함께 다뤘습니다.", "주사위 게임의 공정함을 따지며 가능한 결과를 세는 의사", "우연한 게임에도 계산 가능한 규칙이 있을까요?", "⚄"),
  P("데카르트", "René Descartes", "1596–1650", 1596, "유럽", "17세기", ["기하", "대수", "철학"], "좌표를 이용해 도형을 식으로 표현하는 해석기하의 길을 열었습니다. 그림과 방정식이 서로 번역될 수 있음을 보여 주었습니다.", "움직이는 점의 위치를 두 숫자로 기록해 곡선을 식으로 바꾸는 철학자", "하나의 도형을 그림과 식으로 볼 때 각각 무엇이 더 잘 보일까요?", "(x,y)"),
  P("페르마", "Pierre de Fermat", "1607–1665", 1607, "유럽", "17세기", ["수론", "기하", "확률"], "직업은 법률가였지만 여가에 수론과 해석기하, 확률의 기초에 큰 문제를 남겼습니다. 책 여백의 메모가 수백 년의 도전을 만들기도 했습니다.", "책 여백에 정수의 패턴을 적고 증명의 실마리를 시험하는 아마추어 연구자", "간단히 말할 수 있지만 풀기 어려운 문제는 왜 사람을 끌어당길까요?", "n²"),
  P("파스칼", "Blaise Pascal", "1623–1662", 1623, "유럽", "17세기", ["확률", "조합", "기하"], "도박의 판돈 분배 문제를 통해 확률론의 기초를 세우고, 조합 수를 배열한 삼각형을 체계적으로 연구했습니다.", "중단된 게임의 상금을 공정하게 나누는 방법을 편지로 토론하는 발명가", "아직 일어나지 않은 승리를 어떻게 공정하게 값으로 바꿀까요?", "△"),
  P("뉴턴", "Isaac Newton", "1642–1727", 1642, "유럽", "17세기", ["해석", "물리", "대수"], "운동과 중력을 설명하기 위해 변화율과 누적량을 다루는 미적분을 발전시켰습니다. 빛과 천문학에서도 큰 성과를 냈습니다.", "떨어지는 물체의 순간 속도를 묻고 아주 짧은 시간의 변화를 계산하는 연구자", "한순간의 속도는 실제로 어떻게 측정하고 정의할 수 있을까요?", "∫"),
  P("라이프니츠", "Gottfried W. Leibniz", "1646–1716", 1646, "유럽", "17세기", ["해석", "논리", "계산"], "뉴턴과 독립적으로 미적분을 발전시키고 오늘날까지 쓰이는 기호를 만들었습니다. 이진법과 보편적 계산 언어도 구상했습니다.", "복잡한 생각을 누구나 조작할 수 있는 기호 언어로 만들려는 설계자", "좋은 수학 기호는 우리의 생각 자체를 어떻게 바꿀까요?", "d"),
  P("야코프 베르누이", "Jacob Bernoulli", "1655–1705", 1655, "유럽", "17세기", ["확률", "해석", "통계"], "반복 시행의 평균이 확률에 가까워지는 큰수의 법칙을 연구했습니다. 우연을 장기적인 규칙으로 바라보는 길을 열었습니다.", "동전을 수없이 던진 기록에서 안정되는 비율을 찾는 연구자", "한 번의 결과는 예측하기 어려운데 많은 결과는 왜 안정될까요?", "p"),
  P("오일러", "Leonhard Euler", "1707–1783", 1707, "유럽", "18세기", ["해석", "그래프", "수론"], "함수, 그래프, 수론, 역학 등 거의 모든 분야에 깊은 흔적을 남겼습니다. 쾨니히스베르크 다리 문제로 관계의 구조를 보는 관점을 보여 주었습니다.", "지도에서 거리와 각도를 지우고 오직 연결 관계만 남겨 문제를 푸는 학자", "모양을 버리고 연결만 남겨도 해결할 수 있는 문제는 무엇일까요?", "e"),
  P("마리아 아녜시", "Maria Gaetana Agnesi", "1718–1799", 1718, "유럽", "18세기", ["해석", "교육", "대수"], "미적분을 체계적으로 설명한 교재를 쓴 이탈리아 수학자입니다. 복잡한 새 지식을 명료하게 가르치는 데 큰 역할을 했습니다.", "서로 다른 미적분 표기와 방법을 한 권의 교재로 엮는 교육자", "어려운 개념을 잘 설명하는 일은 어떤 종류의 수학적 창조일까요?", "⌁"),
  P("소피 제르맹", "Sophie Germain", "1776–1831", 1776, "유럽", "18세기", ["수론", "탄성", "물리"], "여성의 교육 기회가 제한된 시대에 가명으로 공부와 서신을 이어 갔습니다. 페르마 문제와 진동하는 판의 수학을 연구했습니다.", "금속판 위 모래가 만드는 무늬를 보며 진동의 방정식을 찾는 독학자", "사회적 장벽은 누가 수학에 참여하고 인정받는지를 어떻게 바꿀까요?", "≈"),
  P("가우스", "Carl F. Gauss", "1777–1855", 1777, "유럽", "18세기", ["수론", "통계", "기하"], "수론, 최소제곱법, 측지학, 곡면의 기하 등 다양한 분야를 통합적으로 발전시켰습니다. 계산과 이론을 함께 중시했습니다.", "오차가 섞인 천문 관측값에서 가장 그럴듯한 궤도를 되찾는 계산가", "측정값이 모두 조금씩 다를 때 가장 믿을 만한 값은 어떻게 정할까요?", "Σ"),
  P("코시", "Augustin-Louis Cauchy", "1789–1857", 1789, "유럽", "19세기", ["해석", "복소수", "대수"], "극한과 연속, 수렴을 엄밀한 언어로 다듬어 미적분의 기초를 튼튼히 했습니다. ‘가까워진다’는 말을 정확히 정의하려 했습니다.", "끝없이 가까워진다는 표현에 빈틈이 없는 정의를 붙이는 연구자", "직관적으로 분명한 생각도 왜 엄밀한 정의가 필요할까요?", "lim"),
  P("로바쳅스키", "Nikolai Lobachevsky", "1792–1856", 1792, "유럽", "19세기", ["기하", "논리"], "유클리드의 평행선 공리를 바꾼 비유클리드 기하를 독립적으로 발전시켰습니다. 당연해 보이던 공간의 규칙을 다시 물었습니다.", "삼각형의 내각 합이 180도가 아닌 공간을 일관되게 상상하는 학자", "공리 하나가 달라지면 ‘참’의 세계는 어떻게 달라질까요?", "∥"),
  P("부울", "George Boole", "1815–1864", 1815, "유럽", "19세기", ["논리", "대수", "계산"], "참과 거짓의 논리를 대수처럼 계산하는 체계를 만들었습니다. 이 생각은 훗날 디지털 회로와 컴퓨터의 기본 언어가 되었습니다.", "‘그리고, 또는, 아니다’를 기호와 식으로 계산해 보는 독학자", "문장의 참과 거짓을 숫자처럼 계산할 수 있을까요?", "0/1"),
  P("갈루아", "Évariste Galois", "1811–1832", 1811, "유럽", "19세기", ["대수", "군론", "방정식"], "방정식의 해법을 대칭의 구조로 바라보며 군론의 씨앗을 만들었습니다. 짧은 생애에 남긴 아이디어가 현대 대수학을 바꾸었습니다.", "방정식의 근을 서로 바꾸어도 유지되는 관계를 밤새 정리하는 청년", "‘답을 구하는 것’과 ‘답이 가능한 구조를 아는 것’은 어떻게 다를까요?", "G"),
  P("에이다 러브레이스", "Ada Lovelace", "1815–1852", 1815, "유럽", "19세기", ["알고리즘", "계산", "음악"], "배비지의 해석기관에 관한 주석에서 기계가 수행할 계산 절차를 상세히 제시했습니다. 계산 기계가 숫자 너머의 기호도 다룰 가능성을 내다봤습니다.", "아직 완성되지 않은 기계가 어떤 순서로 수를 계산할지 표를 만드는 작가", "기계가 숫자뿐 아니라 음악이나 언어도 다룰 수 있으려면 무엇이 필요할까요?", "⌘"),
  P("리만", "Bernhard Riemann", "1826–1866", 1826, "유럽", "19세기", ["기하", "해석", "수론"], "휘어진 공간의 기하와 함수의 깊은 구조를 연구했습니다. 그의 아이디어는 상대성이론과 현대 수론의 언어가 되었습니다.", "한 점마다 공간을 재는 자가 달라지는 휘어진 세계를 상상하는 연구자", "공간 자체가 휘어졌다는 것은 수학적으로 무슨 뜻일까요?", "ζ"),
  P("칸토어", "Georg Cantor", "1845–1918", 1845, "유럽", "19세기", ["집합", "논리", "무한"], "무한에도 서로 다른 크기가 있음을 일대일 대응으로 보였습니다. 수학의 대상을 모아 다루는 집합론의 토대를 놓았습니다.", "자연수와 실수의 목록을 비교하며 무한의 크기가 같은지 묻는 학자", "끝없이 많다는 말 안에도 더 큰 무한과 더 작은 무한이 있을까요?", "ℵ"),
  P("소피야 코발렙스카야", "Sofia Kovalevskaya", "1850–1891", 1850, "유럽", "19세기", ["해석", "미분방정식", "역학"], "여성에게 대학 교육이 제한된 시대를 뚫고 미분방정식과 회전 운동을 연구해 유럽 최초급의 여성 수학 교수가 되었습니다.", "회전하는 물체의 복잡한 움직임을 방정식의 해로 추적하는 교수", "재능만으로는 충분하지 않을 때 학문의 문을 여는 데 무엇이 필요할까요?", "ω"),
  P("데이비트 힐베르트", "David Hilbert", "1862–1943", 1862, "유럽", "19세기", ["기하", "논리", "대수"], "수학의 기초를 공리적으로 정리하고 20세기 수학을 이끈 23개의 문제를 제시했습니다. 좋은 문제의 힘을 보여 준 인물입니다.", "새 세기를 앞두고 다음 세대가 풀어야 할 문제 목록을 만드는 기획자", "정답을 주는 것보다 좋은 문제를 남기는 일이 더 중요할 때는 언제일까요?", "?"),
  P("라마누잔", "Srinivasa Ramanujan", "1887–1920", 1887, "인도", "20세기", ["수론", "무한급수", "조합"], "정규 교육의 제약 속에서도 놀라운 수론 공식과 급수를 발견했습니다. 하디와의 협업을 통해 직관과 증명의 만남을 보여 주었습니다.", "공책에 떠오른 수많은 식을 적고 멀리 있는 연구자에게 편지를 보내는 독학자", "강한 직관을 다른 사람도 확신할 수 있는 증명으로 바꾸려면 무엇이 필요할까요?", "∞"),
  P("에미 뇌터", "Emmy Noether", "1882–1935", 1882, "유럽", "20세기", ["대수", "물리", "대칭"], "대수학의 구조적 관점을 바꾸고, 물리학에서 대칭과 보존법칙을 연결하는 정리를 세웠습니다. 제도적 차별 속에서도 큰 학문 공동체를 만들었습니다.", "겉모양이 달라도 같은 구조를 가진 대상을 하나의 언어로 묶는 교사", "대칭이 존재하면 왜 어떤 양이 보존될까요?", "≅"),
  P("마저리 리 브라운", "Marjorie Lee Browne", "1914–1979", 1914, "북아메리카", "20세기", ["위상", "교육", "대수"], "미국에서 수학 박사학위를 받은 초기 흑인 여성 가운데 한 명입니다. 대학에서 수학교육과 컴퓨터 활용의 기회를 넓혔습니다.", "학생들이 최신 계산 장비를 경험할 수 있도록 교육 환경을 만드는 교수", "수학을 배울 기회의 차이는 누가 새로운 문제를 풀게 되는지에 어떤 영향을 줄까요?", "◯"),
  P("앨런 튜링", "Alan Turing", "1912–1954", 1912, "유럽", "20세기", ["계산", "논리", "암호"], "계산 가능한 것이 무엇인지 추상 기계로 정의하고 암호 해독과 초기 컴퓨터 발전에 기여했습니다. 인공지능에 관한 근본 질문도 던졌습니다.", "종이띠의 기호를 읽고 쓰는 아주 단순한 기계로 모든 계산을 설명하는 논리학자", "어떤 문제는 절차가 있어도 영원히 풀 수 없다는 것을 어떻게 알 수 있을까요?", "01"),
  P("데이비드 블랙웰", "David Blackwell", "1919–2010", 1919, "북아메리카", "20세기", ["통계", "게임이론", "확률"], "통계적 의사결정, 게임이론, 확률 분야에 큰 기여를 한 미국 수학자입니다. 흑인 최초로 미국 국립과학아카데미 회원에 선출되었습니다.", "불완전한 정보 속에서 가장 손해가 적은 선택 규칙을 찾는 연구자", "정보가 늘어나면 의사결정은 언제, 얼마나 좋아질까요?", "E"),
  P("유피미아 헤인스", "Euphemia Haynes", "1890–1980", 1890, "북아메리카", "20세기", ["교육", "대수", "사회"], "수학 박사학위를 받은 최초의 흑인 미국 여성으로 알려져 있으며, 교육자이자 시민운동가로 학교의 불평등한 분리 관행에 맞섰습니다.", "수학 교실의 기회와 학교 제도의 공정함을 함께 고민하는 교육자", "수학 교육의 공정함은 모두에게 같은 것을 주는 일일까요?", "="),
  P("캐서린 존슨", "Katherine Johnson", "1918–2020", 1918, "북아메리카", "20세기", ["계산", "기하", "우주"], "NASA의 유인 우주 비행에서 궤도와 귀환 경로를 계산했습니다. 전자 컴퓨터 결과를 사람이 검증해야 했던 전환기의 계산가였습니다.", "우주선이 지구로 안전하게 돌아올 단 하나의 창을 손으로 검산하는 계산가", "컴퓨터의 답을 믿기 위해 사람은 무엇을 확인해야 할까요?", "↗"),
  P("C. R. 라오", "C. R. Rao", "1920–2023", 1920, "인도", "20세기", ["통계", "확률", "정보"], "추정과 정보의 한계를 설명하는 크라메르–라오 부등식 등 현대 통계학의 핵심 결과를 남겼습니다. 통계를 여러 과학의 공통 언어로 넓혔습니다.", "적은 자료로 추정할 때 피할 수 없는 오차의 한계를 계산하는 통계학자", "좋은 추정량이라도 넘어설 수 없는 정확도의 한계가 있을까요?", "σ"),
  P("줄리아 로빈슨", "Julia Robinson", "1919–1985", 1919, "북아메리카", "20세기", ["논리", "수론", "계산"], "정수 방정식의 해를 판정하는 보편적 절차가 없다는 힐베르트 10번 문제의 해결에 핵심 기여를 했습니다.", "어떤 방정식에 정수해가 있는지 알려 주는 만능 절차를 찾다가 그 불가능성을 추적하는 연구자", "문제를 풀 수 없다는 사실도 수학적으로 증명할 수 있을까요?", "∄"),
  P("브누아 망델브로", "Benoit Mandelbrot", "1924–2010", 1924, "유럽", "20세기", ["프랙탈", "기하", "확률"], "해안선과 구름처럼 거칠고 자기유사적인 모양을 프랙탈 기하로 탐구했습니다. 컴퓨터 시각화를 수학적 발견의 도구로 적극 활용했습니다.", "확대해도 계속 새로운 굴곡이 나타나는 도형을 컴퓨터 화면에 그리는 연구자", "해안선의 길이는 자의 크기에 따라 왜 달라질까요?", "⌬"),
  P("글래디스 웨스트", "Gladys West", "1930–", 1930, "북아메리카", "20세기", ["측지", "계산", "위성"], "위성 자료로 지구의 정확한 모양을 계산하는 모델을 개발해 GPS 기술의 기반에 기여했습니다. 복잡한 오차를 보정하는 계산이 핵심이었습니다.", "수많은 위성 관측값으로 완벽한 구가 아닌 지구의 모양을 맞추는 계산가", "지도의 한 점을 정확히 찾으려면 지구의 모양을 얼마나 자세히 알아야 할까요?", "◎"),
  P("인그리드 도브시", "Ingrid Daubechies", "1954–", 1954, "유럽", "동시대", ["해석", "정보", "영상"], "데이터를 여러 크기의 파동으로 분석하는 웨이블릿 이론을 발전시켰습니다. 이미지 압축과 신호 처리에 널리 쓰입니다.", "사진의 중요한 윤곽은 남기고 반복되는 정보는 줄이는 수학을 설계하는 연구자", "정보를 줄이면서도 원래 모습을 알아볼 수 있게 하려면 무엇을 남겨야 할까요?", "〰"),
  P("다이나 타이미냐", "Daina Taimina", "1954–", 1954, "유럽", "동시대", ["기하", "위상", "교육"], "쌍곡평면을 코바늘뜨기로 구현해 만지고 볼 수 있는 수학 모형을 만들었습니다. 추상 기하를 촉각적 경험과 연결했습니다.", "평평하게 놓이지 않는 쌍곡공간을 한 코씩 늘려 뜨는 수학자", "손으로 만지는 모형은 식이나 그림이 보여 주지 못한 무엇을 알려 줄까요?", "⌇"),
  P("테렌스 타오", "Terence Tao", "1975–", 1975, "오세아니아", "동시대", ["해석", "수론", "조합"], "조화해석, 편미분방정식, 조합론, 수론을 넘나들며 서로 다른 방법을 연결합니다. 소수 안의 긴 등차수열에 관한 정리에도 기여했습니다.", "한 분야의 도구가 막히자 전혀 다른 분야의 관점을 가져와 문제를 푸는 협업자", "수학의 여러 분야를 연결하면 왜 이전에 안 보이던 해법이 나타날까요?", "∇"),
  P("마리암 미르자하니", "Maryam Mirzakhani", "1977–2017", 1977, "중동", "동시대", ["기하", "위상", "동역학"], "휘어진 곡면 위의 경로와 공간의 구조를 연구했으며, 여성 최초의 필즈상 수상자입니다. 큰 종이에 그림을 그리며 오래 탐구한 것으로 알려져 있습니다.", "거대한 종이 위에 곡면과 경로를 반복해서 그리며 패턴을 찾는 연구자", "복잡한 표면 위의 모든 가능한 길을 하나의 공간으로 볼 수 있을까요?", "⌒"),
  P("날리니 아난타라만", "Nalini Anantharaman", "1976–", 1976, "유럽", "동시대", ["동역학", "해석", "물리"], "혼돈적인 동역학과 양자계에서 파동이 어떻게 퍼지는지 연구합니다. 수학과 물리 사이의 깊은 연결을 다룹니다.", "예측하기 어려운 당구대 위 경로와 파동의 분포를 함께 바라보는 연구자", "혼돈 속에서도 반드시 나타나는 분포의 규칙이 있을까요?", "ψ"),
  P("허준이", "June Huh", "1983–", 1983, "동아시아", "동시대", ["조합", "대수", "기하"], "조합론의 개수 세기 문제를 대수기하의 방법과 연결해 해결했습니다. 2022년 필즈상을 수상했습니다.", "그래프의 색칠 경우의 수에서 숨은 기하 구조를 발견하는 연구자", "‘몇 개인가’를 세는 문제 안에 어떤 모양과 대칭이 숨어 있을까요?", "χ"),
  P("마리나 비아조우스카", "Maryna Viazovska", "1984–", 1984, "유럽", "동시대", ["기하", "해석", "수론"], "8차원에서 같은 크기의 구를 가장 촘촘히 쌓는 문제를 해결했습니다. 특별한 함수와 대칭을 결합한 증명으로 2022년 필즈상을 받았습니다.", "상상하기 힘든 8차원에서 구들이 차지하는 비율을 완벽하게 계산하는 연구자", "직접 볼 수 없는 고차원 공간의 최적 배치를 어떻게 확신할 수 있을까요?", "E₈")
];

const ERA_ORDER = ["고대", "중세", "르네상스", "17세기", "18세기", "19세기", "20세기", "동시대"];
const REGION_COLORS = ["#ff735b", "#65d4d1", "#f1bd56", "#8e81e8", "#6a8dbb", "#e184b3", "#7dc47d", "#d28b5c", "#7aa7a6"];
const CARD_COLORS = ["#dff7f3", "#ffe3dc", "#f7e7bd", "#e8e2fa", "#dce8f4", "#e9f0d2"];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE_KEYS = { visited: "mathematician-atlas-visited", favorites: "mathematician-atlas-favorites" };
const loadSet = key => { try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); } };
const saveSet = (key, value) => { try { localStorage.setItem(key, JSON.stringify([...value])); } catch { /* 파일 모드나 저장 차단 환경에서는 현재 화면에서만 유지 */ } };

let filters = { search: "", region: "all", field: "all", era: "all", favoritesOnly: false };
let currentView = "cards";
let filteredPeople = PEOPLE.slice();
let visited = loadSet(STORAGE_KEYS.visited);
let favorites = loadSet(STORAGE_KEYS.favorites);
let currentInterview = { personIndex: 4, question: "" };
let currentChatPerson = PEOPLE[4];

function formatCount(value) { return String(value).padStart(2, "0"); }
function option(value, label = value) { return `<option value="${value}">${label}</option>`; }
function initials(person) { return person.name.replace(/\s/g, "").slice(0, 1); }
function personColor(person) { return CARD_COLORS[Math.abs(person.start) % CARD_COLORS.length]; }

function setup() {
  const regions = [...new Set(PEOPLE.map(p => p.region))].sort();
  const fields = [...new Set(PEOPLE.flatMap(p => p.fields))].sort();
  $("[data-region-filter]").insertAdjacentHTML("beforeend", regions.map(v => option(v)).join(""));
  $("[data-field-filter]").insertAdjacentHTML("beforeend", fields.map(v => option(v)).join(""));
  $("[data-era-filters]").innerHTML = ["all", ...ERA_ORDER].map(v => `<button type="button" data-era="${v}" class="${v === "all" ? "is-active" : ""}">${v === "all" ? "모든 시대" : v}</button>`).join("");
  $("[data-concept-select]").innerHTML = fields.map(v => option(v)).join("");
  const personOptions = PEOPLE.map((p, i) => option(i, `${p.name} · ${p.years}`)).join("");
  $("[data-compare-a]").innerHTML = personOptions;
  $("[data-compare-b]").innerHTML = personOptions;
  $("[data-chat-person]").innerHTML = personOptions;
  $("[data-compare-b]").value = String(Math.min(PEOPLE.length - 1, 20));
  $("[data-chat-person]").value = "4";

  $("[data-total-count]").textContent = PEOPLE.length;
  $("[data-region-count]").textContent = regions.length;
  $("[data-era-count]").textContent = ERA_ORDER.length;
  $("[data-donut-total]").textContent = PEOPLE.length;
  $("[data-visited-total]").textContent = PEOPLE.length;

  bindEvents();
  renderPeople();
  renderDistribution();
  renderConcept(fields[0]);
  renderInterview();
  renderScene();
  updateProgress();
  setChatPerson(4);
  initHeroCanvas();
  initNetwork();
}

function bindEvents() {
  $("[data-search]").addEventListener("input", e => { filters.search = e.target.value.trim().toLowerCase(); renderPeople(); });
  $("[data-region-filter]").addEventListener("change", e => { filters.region = e.target.value; renderPeople(); });
  $("[data-field-filter]").addEventListener("change", e => { filters.field = e.target.value; renderPeople(); });
  $("[data-era-filters]").addEventListener("click", e => {
    const button = e.target.closest("[data-era]"); if (!button) return;
    filters.era = button.dataset.era;
    $$("[data-era]").forEach(b => b.classList.toggle("is-active", b === button));
    renderPeople();
  });
  $("[data-reset]").addEventListener("click", resetFilters);
  $("[data-favorites-filter]").addEventListener("click", () => {
    filters.favoritesOnly = !filters.favoritesOnly;
    const button = $("[data-favorites-filter]");
    button.classList.toggle("is-active", filters.favoritesOnly);
    button.setAttribute("aria-pressed", String(filters.favoritesOnly));
    renderPeople();
  });
  $("[data-next-mission]").addEventListener("click", openNextMission);
  $$("[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  $$('[data-random]').forEach(button => button.addEventListener("click", () => openProfile(PEOPLE[Math.floor(Math.random() * PEOPLE.length)])));
  $("[data-people-grid]").addEventListener("click", handlePersonClick);
  $("[data-people-grid]").addEventListener("keydown", event => {
    if (event.target.closest("button")) return;
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handlePersonClick(event); }
  });
  $("[data-timeline]").addEventListener("click", handlePersonClick);
  $("[data-dialog-close]").addEventListener("click", () => $("[data-profile-dialog]").close());
  $("[data-compare-close]").addEventListener("click", () => $("[data-compare-dialog]").close());
  $("[data-profile-dialog]").addEventListener("click", closeOnBackdrop);
  $("[data-profile-content]").addEventListener("click", handleProfileAction);
  $("[data-compare-dialog]").addEventListener("click", closeOnBackdrop);
  $("[data-concept-select]").addEventListener("change", e => renderConcept(e.target.value));
  $("[data-interview]").addEventListener("click", renderInterview);
  $("[data-chat-launch]").addEventListener("click", launchInterviewChat);
  $("[data-scene]").addEventListener("click", renderScene);
  $("[data-compare-open]").addEventListener("click", openComparison);
  $("[data-theme]").addEventListener("click", () => document.body.classList.toggle("light-contrast"));
  $("[data-chat-person]").addEventListener("change", e => setChatPerson(Number(e.target.value), true));
  $("[data-chat-reset]").addEventListener("click", resetChat);
  $("[data-chat-form]").addEventListener("submit", submitChat);
  $("[data-chat-suggestions]").addEventListener("click", e => { const button = e.target.closest("[data-chat-question]"); if (button) askChat(button.dataset.chatQuestion); });
  document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("[data-search]").focus(); } });
  window.addEventListener("resize", debounce(() => { drawNetwork(); resizeHero(); }, 160));
}

function closeOnBackdrop(event) {
  if (event.target === event.currentTarget) event.currentTarget.close();
}

function resetFilters() {
  filters = { search: "", region: "all", field: "all", era: "all", favoritesOnly: false };
  $("[data-search]").value = ""; $("[data-region-filter]").value = "all"; $("[data-field-filter]").value = "all";
  $$("[data-era]").forEach(b => b.classList.toggle("is-active", b.dataset.era === "all"));
  $("[data-favorites-filter]").classList.remove("is-active");
  $("[data-favorites-filter]").setAttribute("aria-pressed", "false");
  renderPeople();
}

function getFiltered() {
  return PEOPLE.filter(p => {
    const haystack = [p.name, p.en, p.region, p.era, p.story, ...p.fields].join(" ").toLowerCase();
    return (!filters.search || haystack.includes(filters.search)) &&
      (filters.region === "all" || p.region === filters.region) &&
      (filters.field === "all" || p.fields.includes(filters.field)) &&
      (filters.era === "all" || p.era === filters.era) &&
      (!filters.favoritesOnly || favorites.has(PEOPLE.indexOf(p)));
  });
}

function renderPeople() {
  filteredPeople = getFiltered();
  $("[data-result-count]").textContent = filteredPeople.length;
  $("[data-empty]").hidden = filteredPeople.length !== 0;
  $("[data-people-grid]").innerHTML = filteredPeople.map((p) => {
    const index = PEOPLE.indexOf(p);
    return `<article class="person-card ${visited.has(index) ? "is-visited" : ""}" data-person="${index}" tabindex="0" role="button" aria-label="${p.name} 상세 이야기 열기">
      <button class="favorite-button ${favorites.has(index) ? "is-active" : ""}" type="button" data-favorite="${index}" aria-label="${p.name} ${favorites.has(index) ? "즐겨찾기 해제" : "즐겨찾기"}" aria-pressed="${favorites.has(index)}">${favorites.has(index) ? "★" : "☆"}</button>
      <div class="card-portrait" style="--card-bg:${personColor(p)}"><span class="monogram">${initials(p)}</span><span class="portrait-symbol">${p.symbol}</span></div>
      <div class="person-card-body"><div class="card-meta"><span class="era-badge">${p.era} · ${p.years}</span><span class="region-label">${p.region}</span></div>
      <h3>${p.name}<small>${p.en.toUpperCase()}</small></h3><p>${p.story}</p><div class="field-chips">${p.fields.map(f => `<span>${f}</span>`).join("")}</div><span class="open-arrow">↗</span></div>
    </article>`;
  }).join("");
  renderTimeline();
}

function renderTimeline() {
  const groups = ERA_ORDER.map(era => [era, filteredPeople.filter(p => p.era === era)]).filter(([, list]) => list.length);
  $("[data-timeline]").innerHTML = groups.map(([era, list]) => `<section class="timeline-group"><h3>${era}<small>${list.length} PEOPLE</small></h3><div class="timeline-items">${list.sort((a,b) => a.start - b.start).map(p => `<button class="timeline-item" type="button" data-person="${PEOPLE.indexOf(p)}"><b>${p.name}</b><span>${p.years} · ${p.region}</span></button>`).join("")}</div></section>`).join("");
}

function handlePersonClick(event) {
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) { toggleFavorite(Number(favorite.dataset.favorite)); return; }
  const item = event.target.closest("[data-person]"); if (!item) return;
  openProfile(PEOPLE[Number(item.dataset.person)]);
}

function toggleFavorite(index) {
  if (favorites.has(index)) favorites.delete(index); else favorites.add(index);
  saveSet(STORAGE_KEYS.favorites, favorites);
  updateProgress();
  renderPeople();
}

function updateProgress() {
  const count = visited.size;
  $("[data-visited-count]").textContent = count;
  $("[data-favorite-count]").textContent = favorites.size;
  $("[data-progress-bar]").style.width = `${Math.min(100, count / PEOPLE.length * 100)}%`;
}

function openNextMission() {
  const unseen = PEOPLE.map((p, index) => ({ p, index })).filter(item => !visited.has(item.index));
  const pool = unseen.length ? unseen : PEOPLE.map((p, index) => ({ p, index }));
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  openProfile(chosen.p);
}

function setView(view) {
  currentView = view;
  $$("[data-view]").forEach(b => { const active = b.dataset.view === view; b.classList.toggle("is-active", active); b.setAttribute("aria-pressed", active); });
  $("[data-people-grid]").hidden = view !== "cards";
  $("[data-timeline]").hidden = view !== "timeline";
}

function openProfile(p) {
  const index = PEOPLE.indexOf(p);
  visited.add(index);
  saveSet(STORAGE_KEYS.visited, visited);
  updateProgress();
  const related = getRelatedPeople(p, 4);
  $("[data-profile-content]").innerHTML = `<div class="profile-hero" style="--profile-bg:${personColor(p)}">
    <div class="profile-monogram">${initials(p)}<span style="position:absolute;font-size:24px;margin:110px 0 0 120px">${p.symbol}</span></div>
    <div class="profile-title"><span class="era-badge">${p.era} · ${p.region}</span><h2>${p.name}</h2><span>${p.en.toUpperCase()} · ${p.years}</span><p>${p.fields.join(" · ")}</p></div>
  </div><div class="profile-body"><div class="profile-summary"><section class="profile-section"><h3>STORY · 삶과 수학</h3><p>${p.story}</p></section><div class="profile-facts"><div><span>시대</span><b>${p.era} · ${p.years}</b></div><div><span>문화권</span><b>${p.region}</b></div><div><span>연결 분야</span><b>${p.fields.join(" · ")}</b></div></div></div>
  <div class="thought-scene"><span>${p.symbol}</span><div><small>그때의 장면</small><p>${p.scene}</p></div></div>
  <div class="question-box"><b>수업에서 던질 질문</b><p>${p.question}</p></div>
  <div class="profile-actions"><button type="button" data-profile-chat="${index}">이 인물과 대화하기 →</button><button type="button" data-profile-favorite="${index}">${favorites.has(index) ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기"}</button><button type="button" data-profile-react>흥미로워요 +1</button></div>
  <p class="profile-feedback" data-profile-feedback></p>
  <div class="related-people"><b>같은 생각으로 이어지는 인물</b><div class="related-list">${related.map(item => `<button type="button" data-related-person="${item.index}">${item.p.name} · ${item.shared.join("·")}</button>`).join("")}</div></div>
  </div>`;
  if (!$("[data-profile-dialog]").open) $("[data-profile-dialog]").showModal();
  renderPeople();
}

function getRelatedPeople(person, limit = 4) {
  return PEOPLE.map((p, index) => ({ p, index, shared: p.fields.filter(field => person.fields.includes(field)) }))
    .filter(item => item.p !== person && item.shared.length)
    .sort((a, b) => b.shared.length - a.shared.length || Math.abs(a.p.start - person.start) - Math.abs(b.p.start - person.start))
    .slice(0, limit);
}

function handleProfileAction(event) {
  const related = event.target.closest("[data-related-person]");
  if (related) { openProfile(PEOPLE[Number(related.dataset.relatedPerson)]); return; }
  const chat = event.target.closest("[data-profile-chat]");
  if (chat) { $("[data-profile-dialog]").close(); setChatPerson(Number(chat.dataset.profileChat), true); $("#chat-studio").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const favorite = event.target.closest("[data-profile-favorite]");
  if (favorite) { const index = Number(favorite.dataset.profileFavorite); toggleFavorite(index); favorite.textContent = favorites.has(index) ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기"; return; }
  if (event.target.closest("[data-profile-react]")) { event.target.closest("[data-profile-react]").textContent = "흥미로워요 ✓"; $("[data-profile-feedback]").textContent = "이 인물에 대한 흥미 반응을 표시했어요."; }
}

function renderDistribution() {
  const regionCounts = Object.entries(PEOPLE.reduce((acc, p) => ((acc[p.region] = (acc[p.region] || 0) + 1), acc), {})).sort((a,b) => b[1]-a[1]);
  let cursor = 0;
  const stops = regionCounts.map(([_, count], i) => { const start = cursor; cursor += count / PEOPLE.length * 100; return `${REGION_COLORS[i % REGION_COLORS.length]} ${start}% ${cursor}%`; });
  $("[data-donut]").style.background = `conic-gradient(${stops.join(",")})`;
  const max = Math.max(...regionCounts.map(([,c]) => c));
  $("[data-region-bars]").innerHTML = regionCounts.map(([region,count],i) => `<div class="region-bar"><span>${region}</span><i style="--bar:${count/max*100}%;--bar-color:${REGION_COLORS[i%REGION_COLORS.length]}"></i><b>${formatCount(count)}</b></div>`).join("");
  const eraCounts = ERA_ORDER.map(era => [era, PEOPLE.filter(p => p.era === era).length]);
  const eraMax = Math.max(...eraCounts.map(([,c]) => c));
  $("[data-era-river]").innerHTML = eraCounts.map(([era,count]) => `<div class="era-column"><b>${count}</b><i style="--height:${Math.max(10,count/eraMax*105)}px"></i><span>${era}</span></div>`).join("");
}

function renderConcept(field) {
  const matches = PEOPLE.filter(p => p.fields.includes(field)).sort((a,b) => a.start - b.start);
  const first = matches[0], last = matches[matches.length - 1];
  $("[data-concept-story]").innerHTML = matches.length ? `<b style="color:#65d4d1">${field}</b>은(는) ${first.name}의 시대부터 ${last.name}의 시대까지 이 전시에서 <strong style="color:white">${matches.length}명</strong>의 이야기로 이어집니다. 각 점은 같은 주제가 시대에 따라 어떻게 다른 질문으로 바뀌었는지를 보여 줍니다.` : "연결된 인물이 없습니다.";
  $("[data-concept-track]").innerHTML = matches.map(p => `<button class="concept-node" type="button" data-concept-person="${PEOPLE.indexOf(p)}" style="border:0;background:transparent;color:inherit;text-align:left;cursor:pointer"><span>${p.years}</span><b>${p.name}</b><small>${p.scene}</small></button>`).join("");
  $$("[data-concept-person]").forEach(b => b.addEventListener("click", () => openProfile(PEOPLE[Number(b.dataset.conceptPerson)])));
}

const INTERVIEW_QUESTIONS = [
  "처음 그 문제에 마음을 빼앗긴 순간은 언제였나요?", "당시 사람들이 당신의 생각을 믿지 않은 이유는 무엇인가요?", "오늘날의 학생에게 하나의 실험을 권한다면 무엇인가요?", "실패한 시도 가운데 가장 중요한 것은 무엇이었나요?", "당신의 수학을 한 장의 그림으로 표현한다면 어떤 모습인가요?", "다른 시대의 수학자 한 명을 만난다면 누구와 무엇을 이야기하고 싶나요?"
];
function renderInterview() {
  const personIndex = Math.floor(Math.random()*PEOPLE.length), p = PEOPLE[personIndex], q = INTERVIEW_QUESTIONS[Math.floor(Math.random()*INTERVIEW_QUESTIONS.length)];
  currentInterview = { personIndex, question: q };
  $("[data-interview-result]").innerHTML = `<b>${p.name} · ${p.years}</b><p>“${q}”</p>`;
}

const FIELD_APPLICATIONS = {
  "기하": "건축, 지도, 3D 그래픽과 공간 설계", "대수": "암호, 컴퓨터 계산과 과학 모델", "확률": "의학 검사, 위험 판단과 게임", "통계": "데이터 분석, 실험과 정책 판단", "해석": "움직임, 변화와 신호 처리", "수론": "암호와 디지털 보안", "계산": "컴퓨터와 자동화", "논리": "프로그래밍과 인공지능의 추론", "위상": "네트워크, 물질과 공간 구조", "천문": "달력, 항법과 우주 탐사", "교육": "수학을 배우고 가르치는 방법", "정보": "압축, 통신과 데이터 처리"
};

function launchInterviewChat() {
  setChatPerson(currentInterview.personIndex, true);
  $("#chat-studio").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => askChat(currentInterview.question), 450);
}

function setChatPerson(index, markVisited = false) {
  currentChatPerson = PEOPLE[index] || PEOPLE[0];
  if (markVisited) { visited.add(PEOPLE.indexOf(currentChatPerson)); saveSet(STORAGE_KEYS.visited, visited); updateProgress(); renderPeople(); }
  $("[data-chat-person]").value = String(PEOPLE.indexOf(currentChatPerson));
  $("[data-chat-avatar]").textContent = initials(currentChatPerson);
  $("[data-chat-name]").textContent = currentChatPerson.name;
  $("[data-chat-status]").textContent = `${currentChatPerson.era} · ${currentChatPerson.region} 자료 대화`;
  $("[data-chat-person-summary]").innerHTML = `<b>${currentChatPerson.name}</b><span>${currentChatPerson.years} · ${currentChatPerson.fields.join(" · ")}</span><p>${currentChatPerson.story}</p>`;
  resetChat();
}

function resetChat() {
  const box = $("[data-chat-messages]");
  box.replaceChildren();
  addChatMessage("guide", `${currentChatPerson.name}의 기록을 펼쳤어요. 추천 질문을 누르거나 직접 질문해 보세요. 답은 수록된 역사 자료 안에서 재구성합니다.`);
  renderChatSuggestions();
}

function renderChatSuggestions(extra = []) {
  const defaults = ["어떤 문제를 해결하려 했나요?", "대표적인 수학 아이디어는 무엇인가요?", "오늘날 어디에 연결되나요?", "관련 수학자를 소개해 주세요."];
  const questions = [...extra, ...defaults].filter((q, index, all) => all.indexOf(q) === index).slice(0, 5);
  $("[data-chat-suggestions]").innerHTML = questions.map(q => `<button type="button" data-chat-question="${q}">${q}</button>`).join("");
}

function submitChat(event) {
  event.preventDefault();
  const input = $("[data-chat-input]"), question = input.value.trim();
  if (!question) return;
  input.value = "";
  askChat(question);
}

function askChat(question) {
  addChatMessage("user", question);
  $("[data-chat-status]").textContent = "자료에서 답을 찾는 중…";
  const askedPerson = currentChatPerson;
  const result = answerChat(askedPerson, question);
  window.setTimeout(() => {
    if (currentChatPerson !== askedPerson) return;
    addChatMessage("guide", result.answer, result.source);
    renderChatSuggestions(result.followups);
    $("[data-chat-status]").textContent = `${currentChatPerson.era} · ${currentChatPerson.region} 자료 대화`;
  }, 260);
}

function addChatMessage(type, message, source = "") {
  const row = document.createElement("div");
  row.className = `chat-message ${type === "user" ? "chat-message--user" : ""}`;
  const avatar = document.createElement("i");
  avatar.textContent = type === "user" ? "나" : initials(currentChatPerson);
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = message;
  if (source) { const small = document.createElement("small"); small.textContent = `근거: ${source}`; bubble.append(small); }
  row.append(avatar, bubble);
  $("[data-chat-messages]").append(row);
  $("[data-chat-messages]").scrollTop = $("[data-chat-messages]").scrollHeight;
}

function answerChat(person, rawQuestion) {
  const q = rawQuestion.toLowerCase().replace(/\s/g, "");
  const related = getRelatedPeople(person, 3);
  const relatedNames = related.map(item => item.p.name).join(", ");
  const applications = person.fields.map(field => FIELD_APPLICATIONS[field]).filter(Boolean);
  const matchedField = person.fields.find(field => q.includes(field.toLowerCase()));
  const fieldQuestion = [...new Set(PEOPLE.flatMap(p => p.fields))].find(field => q.includes(field.toLowerCase()));
  const namedPerson = PEOPLE.find(p => p !== person && (q.includes(p.name.replace(/\s/g, "").toLowerCase()) || q.includes(p.en.replace(/\s/g, "").toLowerCase())));

  if (/안녕|당신은누구|누구세요|자기소개|이름/.test(q)) return { answer: `${person.name}입니다. ${person.years}, ${person.region}에서 활동한 인물로 이 전시에서는 ${person.fields.join(", ")}의 이야기와 연결되어 있어요.`, source: "인물 기본 정보", followups: ["어떤 문제를 해결하려 했나요?", "당시 시대는 어땠나요?"] };
  if (namedPerson && /비슷|다르|비교|공통|관계/.test(q)) { const common = person.fields.filter(field => namedPerson.fields.includes(field)); return { answer: common.length ? `${person.name}과(와) ${namedPerson.name}은(는) ${common.join(", ")} 분야로 연결됩니다. ${person.name}은(는) ${person.era}, ${namedPerson.name}은(는) ${namedPerson.era} 인물이라 같은 주제가 시대에 따라 어떻게 달라졌는지 비교해 볼 수 있어요.` : `두 인물의 직접 겹치는 분야 태그는 없어요. ${person.name}의 ${person.fields.join(", ")}과(와) ${namedPerson.name}의 ${namedPerson.fields.join(", ")}을 문제와 방법의 차이로 비교해 보세요.`, source: "인물 비교·공유 분야", followups: [person.question, namedPerson.question] }; }
  if (/업적|발견|연구|무엇을했|대표|아이디어/.test(q) || matchedField) return { answer: person.story, source: "삶과 수학", followups: [person.question, "오늘날 어디에 연결되나요?"] };
  if (/언제|시대|어디서|지역|나라|살았/.test(q)) return { answer: `${person.name}은(는) ${person.years}에 해당하며, 이 전시에서는 ${person.region}의 ${person.era} 인물로 분류되어 있어요. 당시의 장면을 떠올리면 ‘${person.scene}’이라고 표현할 수 있습니다.`, source: "연대·문화권 분류", followups: ["그 시대에 왜 이 수학이 필요했나요?", "관련 수학자를 소개해 주세요."] };
  if (/왜|필요|문제|계기|상황/.test(q)) return { answer: `${person.scene}. 이 장면에서 ${person.fields.join(", ")}의 질문이 생겨났다고 생각해 볼 수 있어요.`, source: "그때의 장면", followups: [person.question, "학생인 내가 해볼 실험은?"] };
  if (/어려|실패|차별|힘들|반대/.test(q)) return { answer: `수록 자료만으로 ${person.name}의 감정이나 구체적인 실패를 단정할 수는 없어요. 다만 ${person.era}·${person.region}이라는 환경 속에서 ${person.story}`, source: "확인 가능한 인물 설명", followups: ["당시 시대는 어땠나요?", "기록이 부족하면 어떻게 판단하나요?"] };
  if (/오늘|현대|지금|사용|어디에|연결/.test(q)) return { answer: applications.length ? `${person.fields.join(", ")}의 생각은 오늘날 ${applications.slice(0,3).join(", ")} 같은 주제로 이어집니다. 이는 인물의 직접 발언이 아니라 분야 사이의 교육적 연결이에요.` : `${person.fields.join(", ")} 분야의 후속 연구로 이어졌습니다. 구체적인 현대 활용은 현재 수록 자료의 범위를 넘어 단정하지 않을게요.`, source: "분야 연결 지도", followups: ["관련 수학자를 소개해 주세요.", person.question] };
  if (/관련|비슷|다른수학자|누구와/.test(q)) return { answer: related.length ? `${person.name}과(와) 같은 분야로 이어지는 인물은 ${relatedNames}입니다. ${related.map(item => `${item.p.name}(${item.shared.join("·")})`).join(", ")}의 연결을 비교해 보세요.` : "현재 자료에서 직접 겹치는 분야의 인물을 찾지 못했어요.", source: "공유 분야 관계망", followups: related.map(item => `${item.p.name}과 무엇이 비슷한가요?`) };
  if (/질문|퀴즈|문제내|생각할거리|실험/.test(q)) return { answer: `이 질문을 함께 생각해 봅시다. “${person.question}” 정답 하나보다 근거를 그림이나 말로 설명해 보세요.`, source: "수업 질문 카드", followups: ["힌트를 주세요", "다른 질문을 주세요"] };
  if (/힌트/.test(q)) return { answer: `${person.symbol} 기호와 ‘${person.scene}’이라는 장면을 연결해 보세요. ${person.fields[0]}의 관점에서 무엇을 재거나, 세거나, 비교하는지 찾으면 실마리가 됩니다.`, source: "장면·분야 카드", followups: [person.question, "대표적인 수학 아이디어는 무엇인가요?"] };
  if (fieldQuestion) {
    const hasField = person.fields.includes(fieldQuestion);
    return { answer: hasField ? `${fieldQuestion}은(는) ${person.name}의 핵심 연결 분야입니다. ${person.story}` : `${person.name}의 현재 자료에는 ${fieldQuestion}이(가) 직접 연결되어 있지 않아요. 대신 ${person.fields.join(", ")}을 중심으로 살펴보는 것이 정확합니다.`, source: "분야 태그", followups: ["관련 수학자를 소개해 주세요.", "대표적인 수학 아이디어는 무엇인가요?"] };
  }
  return { answer: `그 질문에 대한 구체적인 기록은 현재 자료에 없어서 답을 지어내지 않을게요. 대신 ${person.name}의 ${person.fields.join(", ")} 연구, 시대적 장면, 관련 인물에 관해서는 답할 수 있습니다.`, source: "자료 범위 확인", followups: ["어떤 문제를 해결하려 했나요?", "당시 시대는 어땠나요?", "관련 수학자를 소개해 주세요."] };
}

const SCENE_STARTERS = ["당신은 이 인물의 동료입니다.", "당신은 새 아이디어를 처음 듣는 비판자입니다.", "당신은 그 시대의 학생입니다.", "당신은 오늘날에서 가져간 계산기 한 대를 들고 있습니다."];
function renderScene() {
  const p = PEOPLE[Math.floor(Math.random()*PEOPLE.length)], starter = SCENE_STARTERS[Math.floor(Math.random()*SCENE_STARTERS.length)];
  $("[data-scene-result]").innerHTML = `<b>${p.era} · ${p.region}</b><p>${starter}<br>${p.scene}. 이 수학이 왜 필요한지 30초 동안 설득해 보세요.</p>`;
}

function openComparison() {
  const a = PEOPLE[Number($("[data-compare-a]").value)], b = PEOPLE[Number($("[data-compare-b]").value)];
  const common = a.fields.filter(f => b.fields.includes(f));
  const column = p => `<article class="compare-column"><h3>${p.name}</h3><span>${p.years} · ${p.region}</span><div class="compare-row"><b>마주한 장면</b><p>${p.scene}</p></div><div class="compare-row"><b>핵심 분야</b><p>${p.fields.join(" · ")}</p></div><div class="compare-row"><b>생각을 여는 질문</b><p>${p.question}</p></div></article>`;
  $("[data-compare-content]").innerHTML = `<div class="compare-board"><h2>두 생각 비교하기</h2><div class="compare-columns">${column(a)}<div class="versus">VS</div>${column(b)}</div><div class="common-ground"><b>공통 연결 고리</b><p>${common.length ? `${common.join(" · ")} 분야에서 두 사람의 생각이 만납니다.` : "직접 겹치는 분야는 없지만, 서로 다른 질문과 방법을 비교할 수 있습니다."}</p></div></div>`;
  $("[data-compare-dialog]").showModal();
}

let heroCanvas, heroCtx, heroNodes = [], heroFrame;
function initHeroCanvas() {
  heroCanvas = $("#hero-canvas"); heroCtx = heroCanvas.getContext("2d");
  heroNodes = Array.from({length: 34}, (_,i) => ({ x: seeded(i*19+3), y: seeded(i*31+7), r: i%7===0?3:1.5, phase: i*.7 }));
  resizeHero(); animateHero();
}
function resizeHero() {
  if (!heroCanvas) return; const rect = heroCanvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio,2);
  heroCanvas.width = rect.width*dpr; heroCanvas.height = rect.height*dpr; heroCtx.setTransform(dpr,0,0,dpr,0,0);
}
function animateHero(time=0) {
  const w=heroCanvas.clientWidth,h=heroCanvas.clientHeight; heroCtx.clearRect(0,0,w,h);
  heroNodes.forEach((n,i)=>{
    const x=n.x*w+Math.sin(time/2200+n.phase)*5, y=n.y*h+Math.cos(time/2600+n.phase)*5;
    heroNodes.slice(i+1).forEach(m=>{ const mx=m.x*w+Math.sin(time/2200+m.phase)*5,my=m.y*h+Math.cos(time/2600+m.phase)*5,d=Math.hypot(x-mx,y-my); if(d<115){ heroCtx.strokeStyle=`rgba(101,212,209,${(1-d/115)*.2})`;heroCtx.lineWidth=.7;heroCtx.beginPath();heroCtx.moveTo(x,y);heroCtx.lineTo(mx,my);heroCtx.stroke(); }});
    heroCtx.fillStyle=i%6===0?"#ff735b":"rgba(255,255,255,.65)";heroCtx.beginPath();heroCtx.arc(x,y,n.r,0,Math.PI*2);heroCtx.fill();
  });
  heroFrame=requestAnimationFrame(animateHero);
}
function seeded(n){ const x=Math.sin(n)*10000; return .08+(x-Math.floor(x))*.84; }

let networkCanvas, networkCtx, networkNodes = [], selectedNode = -1;
function initNetwork() {
  networkCanvas=$("#network-canvas"); networkCtx=networkCanvas.getContext("2d");
  networkNodes=PEOPLE.map((p,i)=>({p,x:seeded(i*13+5),y:seeded(i*23+11),r:i%9===0?5:3}));
  networkCanvas.addEventListener("pointermove", onNetworkMove); networkCanvas.addEventListener("pointerleave",()=>$("[data-network-tooltip]").hidden=true); networkCanvas.addEventListener("click",onNetworkClick);
  drawNetwork();
}
function networkPoint(node,w,h){ return {x:25+node.x*(w-50),y:25+node.y*(h-50)}; }
function drawNetwork() {
  if(!networkCanvas)return; const rect=networkCanvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2); networkCanvas.width=rect.width*dpr;networkCanvas.height=rect.height*dpr;networkCtx.setTransform(dpr,0,0,dpr,0,0);
  const w=rect.width,h=rect.height;networkCtx.clearRect(0,0,w,h);
  const edges=[];networkNodes.forEach((a,i)=>networkNodes.slice(i+1).forEach((b,j)=>{const bi=i+j+1,shared=a.p.fields.filter(f=>b.p.fields.includes(f));const pa=networkPoint(a,w,h),pb=networkPoint(b,w,h),d=Math.hypot(pa.x-pb.x,pa.y-pb.y);if(shared.length&&d<100)edges.push([i,bi,shared]);}));
  edges.forEach(([ai,bi])=>{const a=networkPoint(networkNodes[ai],w,h),b=networkPoint(networkNodes[bi],w,h),active=selectedNode<0||ai===selectedNode||bi===selectedNode;networkCtx.strokeStyle=active?"rgba(101,212,209,.18)":"rgba(94,112,145,.06)";networkCtx.lineWidth=active?1:.5;networkCtx.beginPath();networkCtx.moveTo(a.x,a.y);networkCtx.lineTo(b.x,b.y);networkCtx.stroke();});
  networkNodes.forEach((n,i)=>{const pt=networkPoint(n,w,h),active=selectedNode<0||i===selectedNode||edges.some(e=>(e[0]===selectedNode&&e[1]===i)||(e[1]===selectedNode&&e[0]===i));const color=["고대","중세"].includes(n.p.era)?"#f1bd56":["르네상스","17세기","18세기","19세기"].includes(n.p.era)?"#ff735b":"#65d4d1";networkCtx.globalAlpha=active?1:.15;networkCtx.fillStyle=color;networkCtx.beginPath();networkCtx.arc(pt.x,pt.y,n.r+(i===selectedNode?4:0),0,Math.PI*2);networkCtx.fill();if(i===selectedNode){networkCtx.strokeStyle="rgba(255,255,255,.7)";networkCtx.lineWidth=1;networkCtx.stroke();}networkCtx.globalAlpha=1;});
}
function nearestNetwork(event){const rect=networkCanvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;let nearest=null,dist=14;networkNodes.forEach((n,i)=>{const p=networkPoint(n,rect.width,rect.height),d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;nearest={i,n,p};}});return nearest;}
function onNetworkMove(event){const hit=nearestNetwork(event),tip=$("[data-network-tooltip]");if(!hit){tip.hidden=true;return;}tip.hidden=false;tip.innerHTML=`<b>${hit.n.p.name}</b><span>${hit.n.p.fields.join(" · ")}</span>`;tip.style.left=`${Math.min(networkCanvas.clientWidth-190,hit.p.x+12)}px`;tip.style.top=`${Math.max(8,hit.p.y-18)}px`;}
function onNetworkClick(event){const hit=nearestNetwork(event);selectedNode=hit?hit.i:-1;$("[data-network-hint]").textContent=hit?`${hit.n.p.name}와 같은 분야를 공유하는 연결입니다.`:"점을 선택해 연결을 확인하세요.";drawNetwork();if(hit&&event.detail===2)openProfile(hit.n.p);}

function debounce(fn, wait){let t;return (...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait);};}

setup();
