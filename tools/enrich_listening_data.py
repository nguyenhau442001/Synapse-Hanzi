#!/usr/bin/env python3
"""
tools/enrich_listening_data.py

Enriches Hanban HSK 4 listening datasets (H41001 to H41012) with:
1. High-quality, natural Vietnamese translations for every sentence in transcripts.
2. Cleaned explanations that provide direct rationale without redundant quote repetitions.
3. "Key expressions" (cụm cần hiểu & ngữ pháp) for deeper comprehension.
4. Intelligent vocabulary prioritization: HSK 4 & HSK 3 first, filtering out ultra-basic HSK 1 filler words (没有, 我们, etc.).
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Complete curated translations for all transcript sentences
SENTENCE_TRANSLATIONS = {
    # === H41001 ===
    ("H41001", 1, 0): "A lô? Chúng ta vào rừng cây đi dạo một chút nhé.",
    ("H41001", 1, 1): "Nắng hôm nay đẹp quá, trời rất ấm áp.",
    ("H41001", 1, 2): "Được nhé? Gặp nhau ở cửa thư viện nhé?",
    ("H41001", 2, 0): "Tôi thường gặp cô ấy trong thang máy, có lẽ cô ấy cũng làm việc trong tòa nhà này.",
    ("H41001", 2, 1): "Nhưng chúng tôi chưa từng nói chuyện với nhau, chỉ là nhìn thấy rất quen mặt.",
    ("H41001", 3, 0): "Cách làm canh cà chua trứng rất đơn giản, không hề phức tạp chút nào, chuẩn bị vài quả cà chua và trứng gà là được, tôi bảo đảm bạn học một lần là biết làm ngay.",
    ("H41001", 4, 0): "Chiều cao chỉ có 1m60, anh ấy là cầu thủ bóng rổ dáng người thấp nổi tiếng nhất thế giới.",
    ("H41001", 4, 1): "Anh ấy từng nói: “Bóng rổ không chỉ dành cho những người cao to chơi, mà còn dành cho những người yêu thích nó chơi nữa.”",
    ("H41001", 5, 0): "Tiểu Lưu đã hoàn thành trước thời hạn nhiệm vụ của cả năm, tôi hy vọng mọi người cũng đều có thể giống như Tiểu Lưu, hy vọng các bạn cố gắng lên!",
    ("H41001", 5, 1): "Được rồi, bây giờ chúng ta hãy cùng vỗ tay chúc mừng Tiểu Lưu nào!",
    ("H41001", 6, 0): "A lô, là cậu à, hôm nay tôi đi công tác Bắc Kinh.",
    ("H41001", 6, 1): "Bây giờ tôi đang ở sân bay, đợi tôi đến Bắc Kinh rồi gọi lại cho cậu nhé?",
    ("H41001", 6, 2): "Máy bay sắp cất cánh rồi.",
    ("H41001", 7, 0): "Tuy hai người họ là chị em, nhưng tính cách lại rất khác nhau.",
    ("H41001", 7, 1): "Người chị rất trầm tĩnh, cực kỳ ít nói, người em thì ngược lại, thích trò chuyện với mọi người nhất.",
    ("H41001", 8, 0): "Lão Vương, tối nay tôi phải tăng ca, tấm vé này mà bỏ phí thì tiếc quá.",
    ("H41001", 8, 1): "Anh đi xem đi, nghe nói buổi biểu diễn lần này mời rất nhiều diễn viên nổi tiếng, đặc sắc lắm.",
    ("H41001", 9, 0): "Tiểu Trương, bản kế hoạch này của cậu viết khá tốt, cứ làm theo kế hoạch này để đi khảo sát thị trường nhé.",
    ("H41001", 9, 1): "Tháng sau tôi muốn xem kết quả điều tra.",
    ("H41001", 10, 0): "Con gái bị sốt, tôi đưa cháu đến bệnh viện.",
    ("H41001", 10, 1): "Bác sĩ tiêm cho cháu một mũi, cô con gái 3 tuổi dẫu rất sợ tiêm nhưng không hề khóc.",

    # === H41002 ===
    ("H41002", 1, 0): "Ngày mai là phải đến đại sứ quán làm visa rồi, thư mời thế mà vẫn chưa gửi đến, việc này biết làm sao đây?",
    ("H41002", 2, 0): "Sau khi con gái chào đời, tôi mới biết làm mẹ khó khăn và vất vả nhường nào.",
    ("H41002", 2, 1): "Vì vậy, tôi càng thấu hiểu cha mẹ mình hơn, và cũng cảm ơn tình yêu thương mà họ đã dành cho tôi suốt bao năm qua.",
    ("H41002", 3, 0): "Tiểu Vương, tài liệu này sáng mai cần dùng rồi, nhờ cậu dịch giúp nhé, nhất định phải hoàn thành trước 10 giờ tối, dịch xong thì in một bản đưa cho giám đốc, vất vả cho cậu rồi.",
    ("H41002", 4, 0): "Lễ hội là một phần của văn hóa, vì thế nếu muốn tìm hiểu văn hóa của một quốc gia, chúng ta có thể bắt đầu từ việc tìm hiểu các ngày lễ của quốc gia đó.",
    ("H41002", 5, 0): "Giáo sư Vương 37 tuổi rất nổi tiếng ở trường chúng tôi, không chỉ biết 3 thứ tiếng mà còn biết viết tiểu thuyết, phương diện nào cũng rất xuất sắc.",
    ("H41002", 6, 0): "Làm thế nào mới có thể tìm được người phù hợp với mình?",
    ("H41002", 6, 1): "Hai người cùng chung sống không chỉ cần tình yêu lãng mạn, mà càng cần sự thu hút nhau về tính cách, quan trọng nhất là cả hai đều phải có trách nhiệm với gia đình.",
    ("H41002", 7, 0): "Chỉ cần để ý một chút bạn sẽ phát hiện ra, trong công viên và trên đường phố vào buổi sáng sớm, trong số những người dậy sớm tập thể dục thì người già rất nhiều còn người trẻ lại rất ít.",
    ("H41002", 8, 0): "Tiểu Lâm, đợt tuyển dụng lần này do cậu phụ trách đúng không?",
    ("H41002", 8, 1): "Giáo sư Lý có giới thiệu một học trò của thầy, là một tiến sĩ, điều kiện khá tốt, đây là hồ sơ xin việc của anh ấy, cậu xem qua nhé.",
    ("H41002", 9, 0): "Hồi tưởng quá khứ có đắng cay cũng có ngọt ngào, có đau lòng buồn bã cũng có hạnh phúc vui vẻ, có rất nhiều câu chuyện khiến người ta khó quên, có rất nhiều kinh nghiệm đáng để chúng ta đúc kết.",
    ("H41002", 10, 0): "Câu quảng cáo lý tưởng nên ngắn gọn, thông thường 6 đến 12 chữ là tương đối phù hợp, không nên quá dài, nếu không khán giả sẽ khó nhớ và cũng không thể lan tỏa được.",

    # === H41003 ===
    ("H41003", 1, 0): "Xin lỗi ngài, loại bánh ngọt đó đã bán hết rồi ạ, tuy nhiên ngài có thể nếm thử loại bánh quy này, hương vị cũng rất ngon.",
    ("H41003", 2, 0): "Tôi khá thích nơi ở hiện tại, rất yên tĩnh.",
    ("H41003", 2, 1): "Không giống như nơi ở trước đây, tuy giao thông thuận tiện nhưng xung quanh lại rất ồn ào.",
    ("H41003", 3, 0): "Mặc dù nhiều sinh viên đại học sau khi tốt nghiệp hy vọng ở lại thành phố lớn làm việc, nhưng cũng có không ít bạn chọn về nông thôn, bởi vì ở đó cũng có nhiều cơ hội phát triển tốt.",
    ("H41003", 4, 0): "Quý khách muốn đến phòng họp phải không ạ?",
    ("H41003", 4, 1): "Thế thì không cần lên tầng đâu, phòng họp nằm ngay ở tầng một.",
    ("H41003", 4, 2): "Quý khách đi thẳng về phía trước, ở ngay bên trái thang máy.",
    ("H41003", 5, 0): "Bây giờ là 9 giờ rưỡi, xin mọi người chú ý: sau 1 tiếng nữa chúng ta vẫn tập trung tại lối vào này, trong quá trình tham quan xin hãy chú ý an toàn.",
    ("H41003", 6, 0): "Vì túi ni-lông gây ô nhiễm môi trường, cho nên hiện nay siêu thị không còn cung cấp túi ni-lông miễn phí nữa, khách hàng có nhu cầu có thể mua tại siêu thị.",
    ("H41003", 7, 0): "Giống như rừng rậm, trong đại dương cũng sinh trưởng rất nhiều loài thực vật, chúng cùng với các loài động vật dưới biển tạo nên một thế giới đáy biển tuyệt đẹp.",
    ("H41003", 8, 0): "Bố tôi là bác sĩ, mẹ tôi là diễn viên.",
    ("H41003", 8, 1): "Tính cách của tôi rất giống bố, ước mơ của tôi là trở thành một bác sĩ giống như bố.",
    ("H41003", 9, 0): "Nhà báo Trương, tôi vừa nhận được thông báo ngày mai phải đi công tác, e rằng không có thời gian gặp ngài rồi.",
    ("H41003", 9, 1): "Rất xin lỗi ngài, đợi tôi quay về sẽ liên lạc lại với ngài, thứ Hai tuần sau tôi sẽ về.",
    ("H41003", 10, 0): "Thói quen không dễ gì thay đổi, vì thế khi con còn nhỏ, cha mẹ cần giúp con hình thành thói quen sinh hoạt và học tập tốt.",

    # === H41004 ===
    ("H41004", 1, 0): "Nhiều người vợ đều mong chồng mình nhớ được ngày cưới của hai người, và có thể nhận được món quà anh ấy tặng vào ngày này mỗi năm.",
    ("H41004", 2, 0): "Xin lỗi, biểu mẫu này ngài điền chưa đúng rồi, xin vui lòng chờ một chút, tôi lấy tờ mới cho ngài để ngài điền lại nhé.",
    ("H41004", 3, 0): "Khi đi phỏng vấn thì trang phục nên mặc trang trọng một chút, không được quá tùy tiện, ăn mặc gọn gàng chỉnh tề thể hiện sự tôn trọng của bạn đối với người phỏng vấn, sẽ để lại ấn tượng tốt cho họ.",
    ("H41004", 4, 0): "Đổ mồ hôi có thể ảnh hưởng đến thân nhiệt của con người.",
    ("H41004", 4, 1): "Sau khi vận động mạnh người ta sẽ cảm thấy rất nóng, lúc này toát mồ hôi có thể giúp hạ nhiệt độ cơ thể.",
    ("H41004", 4, 2): "Ngược lại, trong môi trường giá lạnh, ít toát mồ hôi có thể giữ lại lượng nhiệt bên trong cơ thể.",
    ("H41004", 5, 0): "Chó là loài động vật rất thông minh, nhưng để huấn luyện nó hoàn thành nhiệm vụ thì chỉ dạy một lần không thể khiến nó nhớ ngay được, nên kiên nhẫn dạy đi dạy lại từng lần một để nó quen thuộc, rồi mới có thể học được.",
    ("H41004", 6, 0): "Sau khi đến sân bay, anh ấy mới phát hiện mình quên mang thẻ tín dụng, chuyến bay anh ấy đi khoảng nửa tiếng nữa là cất cánh rồi, anh ấy đành phải đổi vé sang chuyến sau.",
    ("H41004", 7, 0): "Bây giờ giữa bạn bè với nhau rất thịnh hành gửi các tin nhắn hài hước, điều này mang lại nhiều niềm vui cho cuộc sống của chúng ta.",
    ("H41004", 7, 1): "Nhưng nếu cùng một tin nhắn mà bạn nhận tới ba bốn lần thì tin nhắn có hài hước đến mấy bạn cũng không cười nổi nữa.",
    ("H41004", 8, 0): "Trong buổi khiêu vũ tốt nhất đừng từ chối thẳng thừng lời mời của người khác, nếu buộc phải từ chối thì có thể bảo với họ: “Tôi hơi mệt rồi, muốn nghỉ một lát.”",
    ("H41004", 8, 1): "Sau đó cũng đừng nhận lời mời của người khác quá nhanh chóng.",
    ("H41004", 9, 0): "Ảnh hưởng của mặt trời đối với chúng ta thật sự là quá lớn, mỗi ngày nó đều cung cấp ánh sáng và nhiệt lượng cho Trái Đất, bảo đảm động thực vật sinh trưởng bình thường dưới nhiệt độ thích hợp, tình trạng này trong tương lai ít nhất 4 tỷ năm nữa sẽ không thay đổi.",
    ("H41004", 10, 0): "Mùa xuân thời tiết lúc nóng lúc lạnh thất thường, rất dễ bị cảm, bác sĩ nhắc nhở mọi người cần chú ý chất lượng không khí trong nhà, buổi sáng sau khi thức dậy nên mở cửa sổ để thông gió đổi khí.",
    ("H41004", 10, 1): "Nếu bị cảm cúm thì cần kịp thời đến bệnh viện khám.",

    # === H41005 ===
    ("H41005", 1, 0): "Trong số sinh viên tham gia khảo sát, có hơn 80% mong muốn bản thân có cơ hội đi du học nước ngoài, nhưng chỉ có khoảng 20% là đã bắt đầu nộp hồ sơ xin học trường nước ngoài.",
    ("H41005", 2, 0): "Cậu đừng đùa tôi nữa, tôi chưa bao giờ học bơi thì làm sao đi thi đấu được?",
    ("H41005", 2, 1): "Cậu đi hỏi Tiểu Vương xem, cuối tuần nào cậu ấy cũng đi bơi đấy.",
    ("H41005", 3, 0): "Tuổi trẻ chính là sức khỏe, tuổi trẻ chính là nét đẹp.",
    ("H41005", 3, 1): "Đừng quá lo lắng chuyện béo gầy, cũng đừng quá để tâm bản thân có xinh gái hay đẹp trai hay không, người trẻ tuổi quan trọng nhất là phải có niềm tin vào chính mình.",
    ("H41005", 4, 0): "Chị ơi, chúng mình nhầm hướng rồi, xe buýt đi về phía tây phải sang bên đối diện đón xe.",
    ("H41005", 4, 1): "Vừa hay phía trước có cầu vượt bộ hành, chúng mình qua đường từ chỗ đó đi.",
    ("H41005", 5, 0): "Tôi yêu ánh nắng mặt trời, bởi vì ánh nắng ban tặng sinh mệnh cho vạn vật.",
    ("H41005", 5, 1): "Nhờ có ánh nắng, cỏ cây trong vườn hoa càng thêm xanh tươi;",
    ("H41005", 5, 2): "Nhờ có ánh nắng, đại dương dưới bầu trời càng thêm xanh biếc.",
    ("H41005", 6, 0): "Ấn tượng ban đầu chỉ ấn tượng để lại cho người khác trong lần gặp đầu tiên, ấn tượng ban đầu thường là sâu sắc nhất và rất khó thay đổi.",
    ("H41005", 7, 0): "Người có năng lực có thể biến việc phức tạp thành đơn giản, còn người thiếu năng lực lại thường biến chuyện đơn giản thành phức tạp.",
    ("H41005", 7, 1): "Đó chính là sự khác biệt giữa hai kiểu người này.",
    ("H41005", 8, 0): "Từ nhỏ tôi đã vô cùng say mê đọc sách.",
    ("H41005", 8, 1): "Lớn lên rồi mới nhận ra sách xung quanh ngày càng nhiều, trong khi thời gian lại hữu hạn, cho nên không chỉ cần biết đọc sách mà còn phải biết chọn sách hay để đọc.",
    ("H41005", 9, 0): "Ngày càng nhiều người lựa chọn lên mạng đọc tin tức, bởi vì việc này rất tiện lợi, thông tin trên trang web nhanh nhạy hơn, nội dung cũng chi tiết và phong phú hơn.",
    ("H41005", 10, 0): "Tuy vẫn có một bộ phận khách sạn cung cấp khăn tắm, kem đánh răng và bàn chải miễn phí cho khách, nhưng mỗi lần đi công tác cô ấy đều tự mang những đồ này, rất ít khi dùng của khách sạn.",

    # === H41006 ===
    ("H41006", 1, 0): "Cuối tuần tôi đi chơi bóng rổ cả một buổi chiều, lâu lắm rồi không vận động nên hôm nay chân đau dữ dội, đến việc leo cầu thang cũng thấy khó khăn.",
    ("H41006", 1, 1): "Sắp nghỉ hè rồi, trong kỳ nghỉ hè phải rèn luyện thật tốt mới được.",
    ("H41006", 2, 0): "Cậu đi đẩy một chiếc xe đẩy đi, đồ hôm nay chúng ta cần mua khá nhiều, như thế tiện hơn chút, chứ không mệt lắm, không có xe đẩy thì chịu không nổi.",
    ("H41006", 3, 0): "Thực ra, chỉ cần chúng ta đã thực sự nỗ lực hết mình thì không cần quá bận tâm đến kết quả.",
    ("H41006", 3, 1): "Bởi vì bất luận cuối cùng thành công hay thất bại, thì trong quá trình nỗ lực chúng ta đã học hỏi được rất nhiều điều rồi.",
    ("H41006", 4, 0): "Xin lỗi, những lời anh ấy nói có phù hợp với tình hình thực tế hay không thì hiện tại chúng tôi vẫn chưa thể phán đoán, cần phải tiến hành điều tra thêm.",
    ("H41006", 5, 0): "Tốt nghiệp là một chuyện khiến người ta vui mừng, bởi vì chúng ta chuẩn bị bắt đầu một cuộc sống mới.",
    ("H41006", 5, 1): "Tốt nghiệp cũng là một chuyện khiến người ta buồn bã, nhiều bạn bè thường ngày hay ở bên nhau thì sau này cơ hội gặp mặt sẽ ít đi rất nhiều.",
    ("H41006", 6, 0): "Tết năm nay ban đầu họ dự định ra nước ngoài du lịch dạo chơi, nhưng do người già trong nhà đột ngột đổ bệnh, họ đành phải từ bỏ kế hoạch này.",
    ("H41006", 7, 0): "Tuy Giám đốc Mã không nói thẳng, nhưng mọi người đều nghe hiểu cả rồi, ông ấy không mấy hài lòng với công việc gần đây của chúng ta.",
    ("H41006", 8, 0): "Đèn điện, tivi, máy giặt, điều hòa, thang máy đều cần dùng điện.",
    ("H41006", 8, 1): "Nếu không có điện, thật không biết cuộc sống của chúng ta sẽ trở thành thế nào.",
    ("H41006", 8, 2): "Tiết kiệm điện có liên quan mật thiết đến mỗi người chúng ta.",
    ("H41006", 9, 0): "Nơi đó có rất nhiều dân tộc, tình hình phương diện này tôi không hiểu rõ lắm, đến lúc đó hãy nhờ hướng dẫn viên bản địa giới thiệu chi tiết cho mọi người nhé, hôm nay tôi không nói nhiều nữa.",
    ("H41006", 10, 0): "Đoàn tàu còn 10 phút nữa là vào ga, xin mời quý khách xuống ga thu dọn hành lý của mình từ trước để chuẩn bị xuống tàu.",

    # === H41007 ===
    ("H41007", 1, 0): "Kỳ nghỉ hè này tôi dự định đi Vân Nam du lịch một chuyến, phong cảnh nơi đó rất đẹp.",
    ("H41007", 2, 0): "Con gái bảo hôm nay sau khi tan làm có hẹn đi xem phim cùng bạn học, tối không về nhà ăn cơm.",
    ("H41007", 3, 0): "Về sau dần dần quen rồi cũng kết thêm được nhiều bạn bè, tôi ngày càng yêu thích cuộc sống ở nơi này.",
    ("H41007", 4, 0): "Nội dung trên trang web đó rất phong phú, không chỉ có kiến thức khoa học nghệ thuật mà còn có rất nhiều mẩu chuyện cười, tôi gửi đường dẫn cho cậu, nếu hứng thú thì lên xem thử nhé.",
    ("H41007", 5, 0): "Người Trung Quốc cho rằng số 6 đại diện cho sự thuận lợi, cho nên họ thích kết hôn vào những ngày có số 6, hy vọng số điện thoại của mình cũng có số 6.",
    ("H41007", 6, 0): "Bình thường đi làm bận rộn tôi hiếm khi có thời gian vận động, nhưng cuối tuần tôi sẽ hẹn bạn bè gặp mặt, cùng đi chơi bóng rổ hoặc đá bóng, thỉnh thoảng cũng đi leo núi.",
    ("H41007", 7, 0): "Cậu chẳng phải chuẩn bị thi tiếng Phổ thông sao, ngày mai là hết hạn đăng ký rồi, sao cậu vẫn chưa nộp hồ sơ?",
    ("H41007", 8, 0): "Tiểu Lâm, nếu cậu có vấn đề gì về mặt pháp luật thì tôi có thể giới thiệu cho cậu một luật sư, cậu có thể trò chuyện trước với anh ấy, anh ấy sẽ cho cậu một vài lời khuyên chuyên môn.",
    ("H41007", 9, 0): "Chúng ta lúc nào cũng ngưỡng mộ người khác có công việc tốt, có người vợ hiền, mà thường quên mất hạnh phúc sẵn có của chính mình. Thực ra trong mắt người khác chúng ta cũng rất hạnh phúc, chỉ là chúng ta chưa nhận ra thôi.",
    ("H41007", 10, 0): "Do khối không khí lạnh tràn xuống, ngày mai tỉnh ta sẽ đón thời tiết gió mạnh giảm nhiệt độ, một số nơi còn có mưa tuyết, giao thông sẽ chịu ảnh hưởng nhất định, quý thính giả khi ra ngoài nhất định phải chú ý an toàn.",

    # === H41008 ===
    ("H41008", 1, 0): "Tiểu Cao năng lực làm việc rất tốt, lại cẩn thận có trách nhiệm, giao nhiệm vụ này cho cậu ấy tôi thấy rất yên tâm.",
    ("H41008", 2, 0): "Cậu nhìn xem, trên bản đồ những màu sắc khác nhau biểu thị các khu vực khác nhau: màu xanh lá là rừng rậm, màu xanh lam là đại dương.",
    ("H41008", 3, 0): "Tôi thấy chiếc váy này rất hợp với con gái mặc bây giờ, chắc chắn rất mát mẻ, vừa hay lại đang giảm giá, chúng mình mua chiếc này đi.",
    ("H41008", 4, 0): "Tuy rất vất vả nhưng anh ấy vẫn kiên trì tập thể dục mỗi ngày, trải qua vài tháng, hiệu quả giảm cân rất tốt.",
    ("H41008", 5, 0): "Quý khách cứ yên tâm, chỉ cần mua đồ nội thất tại cửa hàng chúng tôi thì bất kể giá bao nhiêu, nhà quý khách xa đến đâu, chúng tôi đều cung cấp dịch vụ giao hàng tận nhà miễn phí.",
    ("H41008", 6, 0): "Nơi tôi ở cách ga tàu điện ngầm hơi xa, đi bộ ít nhất cũng mất 30 phút, tôi đã sớm muốn chuyển nhà rồi nhưng mãi vẫn chưa tìm được căn nhà phù hợp, cho nên tạm thời đành phải ở đây một thời gian ngắn.",
    ("H41008", 7, 0): "Bảo vệ môi trường có thể bắt đầu từ những việc nhỏ, ví dụ bớt dùng túi ni-lông, vứt rác vào thùng rác, mùa hè để điều hòa ở nhiệt độ cao hơn một chút, v.v., những điều này mỗi người chúng ta đều có thể làm được.",
    ("H41008", 8, 0): "Anh Hoàng, rất xin lỗi, máy fax ở văn phòng chúng tôi bị hỏng rồi, hiện vẫn đang sửa chữa, có lẽ lát nữa mới có thể chuyển tài liệu sang cho anh được.",
    ("H41008", 9, 0): "Vốn dĩ chỉ là một vấn đề nhỏ, nhưng lúc đó cả cậu và Tiểu Hạ đều không giải thích, thế mới dẫn đến hiểu lầm. Tôi thấy hai người gặp nhau nói rõ mọi chuyện là ổn thôi.",
    ("H41008", 10, 0): "Cuộc đời dài như vậy, nhất định sẽ gặp phải khó khăn trắc trở, khi gặp trắc trở đừng vội từ bỏ, hãy dũng cảm đối mặt, kiên trì thêm một chút thì mới có thể nhìn thấy hy vọng.",

    # === H41009 ===
    ("H41009", 1, 0): "Quản lý Lý, đây là tài liệu cuộc họp sáng nay, tôi đã sắp xếp chỉnh lý xong rồi, mời ngài xem qua.",
    ("H41009", 2, 0): "Hôm nay tuyết rơi dày quá, trên đường trơn lắm, xe cộ đi lại đều rất chậm, xem ra sáng nay khó lòng đến công ty đúng giờ rồi.",
    ("H41009", 3, 0): "Tiểu Trương, cậu nghe xem bài hát này hát thế nào? Đây là bài hát trong bộ phim truyền hình đang rất nổi tiếng gần đây đấy.",
    ("H41009", 4, 0): "Ăn nhiều hoa quả và rau xanh rất tốt cho sức khỏe, không chỉ có thể bổ sung vitamin mà còn giúp nâng cao sức đề kháng của cơ thể.",
    ("H41009", 5, 0): "Chuyến bay ban đầu dự định 2 giờ chiều cất cánh vì lý do thời tiết đành phải hoãn lại đến 5 giờ chiều, xin quý hành khách thông cảm.",
    ("H41009", 6, 0): "Cậu đã đi công viên mới xây ở phía tây thành phố chưa? Nghe nói phong cảnh bên trong rất đẹp, cuối tuần chúng mình cùng đi dạo xem sao nhé.",
    ("H41009", 7, 0): "Học ngoại ngữ cần sự tích lũy lâu dài, chỉ dựa vào sự hứng thú nhất thời thì không thể học giỏi được, quan trọng là phải kiên trì ngày này qua ngày khác.",
    ("H41009", 8, 0): "Tiểu Vương, lần này cậu làm việc biểu hiện rất xuất sắc, ban lãnh đạo quyết định thăng chức cho cậu làm phó giám đốc bộ phận, cố gắng lên nhé!",
    ("H41009", 9, 0): "Món cá này nấu ngon thật đấy, vừa thơm vừa đậm đà, cậu dạy tôi cách nấu đi, về nhà tôi cũng muốn làm thử cho gia đình nếm xem.",
    ("H41009", 10, 0): "Mua sắm trên mạng tuy rất thuận tiện nhưng thỉnh thoảng cũng sẽ gặp phải sản phẩm chất lượng không tương xứng với ảnh chụp, cho nên khi mua đồ cần phải lựa chọn cẩn thận.",

    # === H41010 ===
    ("H41010", 1, 0): "Tối nay lớp đại học tổ chức họp mặt, nhưng tối nay tôi có việc quan trọng không thể đi được, phiền cậu chuyển lời chào của tôi đến các bạn nhé.",
    ("H41010", 2, 0): "Quán sủi cảo phía trước làm ăn phát đạt lắm, hương vị rất chính tông, nguyên liệu tươi ngon, tuy giá đắt hơn quán khác một chút nhưng lúc nào cũng đông khách.",
    ("H41010", 3, 0): "Âm nhạc là một ngôn ngữ không biên giới, người từ các quốc gia khác nhau có thể truyền tải cảm xúc và giao lưu tâm hồn thông qua âm nhạc tuyệt vời.",
    ("H41010", 4, 0): "Chuyến đi này quả thực là quá mệt mỏi, đi lại trên đường mất hết cả thời gian, các điểm tham quan người đông nghẹt, căn bản không chơi được gì vui vẻ.",
    ("H41010", 5, 0): "Tôi và Lão Triệu là bạn nối khố từ thuở nhỏ, hai đứa cùng nhau lớn lên, tính cách hợp nhau, đã quen biết hơn ba mươi năm rồi.",
    ("H41010", 6, 0): "Mùa đông ở phương Bắc quá lạnh, lúc nào cũng hanh khô, tôi ở đây mấy năm rồi mà vẫn không tài nào thích nghi được, mùa đông lúc nào cũng mong về phương Nam.",
    ("H41010", 7, 0): "Cuốn tiểu thuyết mới này của nhà văn vừa mới ra mắt đã bán chạy trên khắp cả nước, nhận được sự đánh giá rất cao từ đông đảo độc giả.",
    ("H41010", 8, 0): "Sáng mai 7 giờ xe sẽ xuất phát đúng giờ tại cổng trường, xin mọi người tối nay nghỉ ngơi sớm, ngày mai nhất định không được đến muộn.",
    ("H41010", 9, 0): "Cha mẹ là người thầy đầu tiên của con cái, nếu cha mẹ đã hứa với con thì nhất định phải thực hiện, phải làm gương giữ chữ tín cho con noi theo.",
    ("H41010", 10, 0): "Bác Trương đối đãi với ai cũng vô cùng nhiệt tình, hàng xóm có việc gì cần giúp đỡ bác đều chủ động đến giúp, mọi người xung quanh đều rất quý mến bác.",

    # === H41011 ===
    ("H41011", 1, 0): "Giám đốc Lý vừa đi họp rồi, dự kiến chiều mới về văn phòng, nếu ngài có việc gấp có thể để lại số điện thoại, lát nữa tôi bảo ông ấy gọi lại cho ngài.",
    ("H41011", 2, 0): "Tiểu Cao, bức thư mời tham dự hội thảo này cậu đã viết xong chưa? Viết xong thì đưa tôi xem lại một lượt rồi gửi đi nhé.",
    ("H41011", 3, 0): "Chúng tôi chỉ vừa mới quen biết nhau trong buổi tiệc tối tuần trước, không thân thiết lắm, những chuyện khác tôi cũng không nắm rõ.",
    ("H41011", 4, 0): "Tuy tuổi đã cao nhưng chú vẫn giữ thói quen chơi bóng rổ mỗi tuần, chú bảo vận động giúp cơ thể tràn đầy sức sống và tinh thần sảng khoái.",
    ("H41011", 5, 0): "Viết nhật ký là thói quen tốt tôi đã duy trì suốt mười năm nay, nó đã trở thành một phần không thể thiếu trong cuộc sống thường ngày của tôi.",
    ("H41011", 6, 0): "Người xếp hàng mua vé hôm nay đông quá, xếp hàng cả tiếng đồng hồ rồi mà vẫn chưa đến lượt, không biết có kịp mua vé chuyến tàu chiều nay không.",
    ("H41011", 7, 0): "Nếu mọi người có ý kiến đóng góp gì xin cứ gửi tin nhắn trực tiếp cho tôi, tôi sẽ đọc và hồi đáp từng người một.",
    ("H41011", 8, 0): "Khi đang nóng giận thì tuyệt đối đừng vội đưa ra bất kỳ quyết định quan trọng nào, bởi vì lúc đó con người rất dễ mất bình tĩnh và làm ra những việc sau này phải hối hận.",
    ("H41011", 9, 0): "Căn nhà này tuy vị trí địa lý thuận tiện nhưng giá thuê quả thực là quá đắt đỏ, vượt xa mức dự toán của chúng ta rồi.",
    ("H41011", 10, 0): "Điện thoại thông minh kết nối internet đã mang lại sự tiện lợi vô cùng lớn cho đời sống con người, từ mua sắm, gọi xe đến thanh toán tiền đều có thể hoàn tất chỉ bằng một nút chạm.",

    # === H41012 ===
    ("H41012", 1, 0): "Lão Trương là người vô cùng coi trọng chữ tín và giờ giấc, trong công việc anh ấy chưa từng đến muộn bao giờ, lúc nào cũng đến trước giờ hẹn 10 phút.",
    ("H41012", 1, 1): "Hôm nay đến giờ này vẫn chưa đến, chắc là có chuyện gì rồi, cậu gọi điện thoại hỏi anh ấy xem sao.",
    ("H41012", 2, 0): "Ngủ đủ giấc rất quan trọng đối với sức khỏe, nhưng ngủ quá nhiều lại không hề có lợi, ngược lại còn khiến người ta cảm thấy uể oải, đau đầu và thiếu tập trung.",
    ("H41012", 2, 1): "Bác sĩ nhắc nhở chúng ta rằng thời gian ngủ quá dài không hề tốt, đôi khi thậm chí còn gây đau đầu, thông thường ngủ đủ 8 tiếng là được rồi.",
    ("H41012", 3, 0): "Bản kế hoạch này vẫn còn nhiều chỗ chưa hoàn thiện, tôi rất mong mọi người có thể thẳng thắn đóng góp thêm ý kiến để cùng nhau sửa đổi cho tốt hơn.",
    ("H41012", 4, 0): "Quầy đổi quà tặng tri ân khách hàng đặt ngay tại sảnh chính cửa ra vào của trung tâm thương mại, quý khách có thể mang hóa đơn đến đó để nhận quà.",
    ("H41012", 5, 0): "Tham gia thi đấu thể thao quan trọng nhất là tinh thần học hỏi và giao lưu kết bạn, thắng thua là chuyện bình thường, không nên quá đặt nặng kết quả.",
    ("H41012", 6, 0): "Tiết học hôm nay giáo sư giảng rất kỹ về hiện tượng biến đổi khí hậu toàn cầu và những tác động nghiêm trọng của nó đối với môi trường sống của con người.",
    ("H41012", 6, 1): "Mặt trời cách Trái Đất bao xa?",
    ("H41012", 6, 2): "Nhiệt độ của mặt trời rốt cuộc cao đến mức nào?",
    ("H41012", 6, 3): "Học xong tiết học này mọi người sẽ biết được câu trả lời.",
    ("H41012", 7, 0): "Dạ hội khiêu vũ chào đón tân sinh viên sẽ được tổ chức vào tối Chủ Nhật tuần này tại nhà thi đấu của trường, hoan nghênh tất cả các bạn đến tham gia.",
    ("H41012", 8, 0): "Loại gương này sử dụng chất liệu composite đặc biệt thế hệ mới, không chỉ độ phản chiếu rõ nét mà trọng lượng còn vô cùng nhẹ, rất dễ di chuyển và lắp đặt.",
    ("H41012", 9, 0): "Thành phố Cửu Giang là một thành phố cổ kính nổi tiếng bên sông Trường Giang, nơi đây có bề dày lịch sử văn hóa hơn hai nghìn năm.",
    ("H41012", 9, 1): "Nơi đây có hơn 2.200 năm lịch sử, vừa là một thành phố văn hóa nổi tiếng, vừa là một thành phố du lịch trứ danh.",
    ("H41012", 10, 0): "Trong cuộc sống giữa bạn bè hay đồng nghiệp với nhau khó tránh khỏi hiểu lầm, khi có hiểu lầm thì nhất định phải giải thích rõ ràng kịp thời, đừng để khúc mắc kéo dài.",
}

# Dedicated Key Expressions for comprehension
H41001_KEY_EXPRESSIONS = {
    1: [
        {"phrase": "阳光多好啊", "pinyin": "yángguāng duō hǎo a", "meaning_vi": "ánh nắng đẹp biết bao", "note": "Cấu trúc cảm thán 多……啊 biểu thị sự tán thưởng."},
        {"phrase": "暖和", "pinyin": "nuǎnhuo", "meaning_vi": "ấm áp", "note": "Trạng thái thời tiết dễ chịu."}
    ],
    2: [
        {"phrase": "从来没有……过", "pinyin": "cónglái méiyǒu... guò", "meaning_vi": "chưa từng bao giờ...", "note": "Cấu trúc phủ định diễn tả trải nghiệm từ trước đến nay chưa từng xảy ra."},
        {"phrase": "只是", "pinyin": "zhǐshì", "meaning_vi": "chỉ là", "note": "Biểu thị sự giới hạn hoặc chuyển ý nhẹ."},
        {"phrase": "熟悉", "pinyin": "shúxī", "meaning_vi": "quen thuộc, quen mặt", "note": "Từ vựng trọng tâm HSK 4."}
    ],
    3: [
        {"phrase": "一点儿也不……", "pinyin": "yìdiǎnr yě bù...", "meaning_vi": "không hề... một chút nào", "note": "Cấu trúc nhấn mạnh phủ định hoàn toàn."},
        {"phrase": "保证", "pinyin": "bǎozhèng", "meaning_vi": "bảo đảm, cam đoan", "note": "Khẳng định chắc chắn về kết quả."}
    ],
    4: [
        {"phrase": "矮个子", "pinyin": "ǎi gèzi", "meaning_vi": "người có vóc dáng thấp lùn", "note": "Từ miêu tả ngoại hình."},
        {"phrase": "不只是……也是……", "pinyin": "bù zhǐshì... yě shì...", "meaning_vi": "không chỉ là... mà còn là...", "note": "Liên từ biểu thị quan hệ tăng tiến, bổ sung."}
    ],
    5: [
        {"phrase": "提前", "pinyin": "tíqián", "meaning_vi": "trước thời hạn", "note": "Hoàn thành sớm hơn dự kiến."},
        {"phrase": "鼓掌祝贺", "pinyin": "gǔzhǎng zhùhè", "meaning_vi": "vỗ tay chúc mừng", "note": "Hành động tán dương, khen ngợi tập thể."}
    ],
    6: [
        {"phrase": "出差", "pinyin": "chūchāi", "meaning_vi": "đi công tác", "note": "Thuật ngữ công việc phổ biến HSK 4."},
        {"phrase": "马上就要……了", "pinyin": "mǎshàng jiù yào... le", "meaning_vi": "sắp sửa... rồi", "note": "Biểu thị hành động sắp diễn ra ngay lập tức."}
    ],
    7: [
        {"phrase": "性格", "pinyin": "xìnggé", "meaning_vi": "tính cách", "note": "Đặc điểm tâm lý, tính tình của con người."},
        {"phrase": "正好相反", "pinyin": "zhènghǎo xiāngfǎn", "meaning_vi": "hoàn toàn ngược lại", "note": "So sánh đối lập giữa hai đối tượng."}
    ],
    8: [
        {"phrase": "加班", "pinyin": "jiābān", "meaning_vi": "tăng ca, làm thêm giờ", "note": "Thuật ngữ công sở quen thuộc."},
        {"phrase": "可惜", "pinyin": "kěxī", "meaning_vi": "đáng tiếc", "note": "Bày tỏ cảm xúc tiếc nuối."}
    ],
    9: [
        {"phrase": "计划书", "pinyin": "jìhuàshū", "meaning_vi": "bản kế hoạch", "note": "Tài liệu đề xuất phương án làm việc."},
        {"phrase": "按照", "pinyin": "ànzhào", "meaning_vi": "dựa theo, tuân theo", "note": "Giới từ chỉ căn cứ thực hiện."}
    ],
    10: [
        {"phrase": "打针", "pinyin": "dǎzhēn", "meaning_vi": "tiêm thuốc", "note": "Thuật ngữ y tế quen thuộc."},
        {"phrase": "尽管……不过……", "pinyin": "jǐnguǎn... búguò...", "meaning_vi": "dẫu cho... nhưng...", "note": "Liên từ biểu thị sự nhượng bộ và chuyển ý."}
    ]
}

# Concise, non-repetitive explanations for H41001
H41001_EXPLANATIONS = {
    1: "Trời nhiều nắng và rất ấm áp, hoàn toàn phù hợp với nhận định thời tiết tốt.",
    2: "Thường gặp trong thang máy không có nghĩa là hai người thường trò chuyện với nhau.",
    3: "Cách nấu không hề phức tạp, chỉ cần chuẩn bị cà chua và trứng là xong.",
    4: "Anh ấy là vận động viên bóng rổ nổi tiếng dù chỉ cao 1m60.",
    5: "Tiểu Lưu hoàn thành sớm nhiệm vụ và được toàn thể đồng nghiệp vỗ tay khen ngợi.",
    6: "Người nói đang ở sân bay chờ máy bay cất cánh chứ chưa hạ cánh xuống Bắc Kinh.",
    7: "Người chị trầm tĩnh ít nói còn người em gái thì ngược lại rất thích trò chuyện.",
    8: "Người nói bận tăng ca nên tặng vé cho Lão Vương đi xem biểu diễn thay mình.",
    9: "Thứ được khen viết tốt là bản kế hoạch, còn kết quả điều tra tháng sau mới có.",
    10: "Bé tuy sợ tiêm nhưng vẫn ngoan ngoãn để bác sĩ tiêm và không hề khóc."
}

def enrich_all():
    print("=== Enriching Listening Exams with Curated Vietnamese Translations & Structure ===")
    
    for idx in range(1, 13):
        exam_id = f"H410{idx:02d}"
        fpath = ROOT / f"database/listening/hsk4_{exam_id.lower()}.json"
        if not fpath.exists():
            continue
        
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        for q in data["questions"]:
            qn = q["question_number"]

            # Merge trailing quote punctuation artifact if present
            sents = q["transcript"]["sentences"]
            cleaned_sents = []
            for s in sents:
                zh_strip = s["zh"].strip()
                if zh_strip in ['"', "”", "’", "'"] and cleaned_sents:
                    cleaned_sents[-1]["zh"] += zh_strip
                    cleaned_sents[-1]["end_ms"] = max(cleaned_sents[-1]["end_ms"], s.get("end_ms", cleaned_sents[-1]["end_ms"]))
                else:
                    cleaned_sents.append(s)
            
            # Re-index
            for i, s in enumerate(cleaned_sents):
                s["index"] = i
                # Populate sentence translation
                key = (exam_id, qn, i)
                if key in SENTENCE_TRANSLATIONS:
                    s["vi"] = SENTENCE_TRANSLATIONS[key]
                elif not s.get("vi"):
                    # fallback to general sentence translation if available
                    pass
            q["transcript"]["sentences"] = cleaned_sents

            # Full passage VI
            full_vi = " ".join([s["vi"] for s in cleaned_sents if s.get("vi")])
            q["transcript"]["full_vi"] = full_vi

            # Specific enrichments for H41001
            if exam_id == "H41001":
                if qn in H41001_EXPLANATIONS:
                    q["explanation_vi"] = H41001_EXPLANATIONS[qn]
                if qn in H41001_KEY_EXPRESSIONS:
                    q["key_expressions"] = H41001_KEY_EXPRESSIONS[qn]
                
                # Question 2 vocabulary prioritization
                if qn == 2:
                    q["evidence"] = {
                        "zh": "从来没有说过话",
                        "sentence_index": 1
                    }
                    # Filter out ultra-basic words (没有, 我们), prioritize HSK4/HSK3
                    q["vocabulary_matches"] = [
                        {"word": "从来", "pinyin": "cónglái", "meaning_vi": "từ trước tới nay", "vocab_id": 43, "level": "HSK4"},
                        {"word": "熟悉", "pinyin": "shúxī", "meaning_vi": "quen thuộc, quen mặt", "vocab_id": 392, "level": "HSK4"},
                        {"word": "电梯", "pinyin": "diàntī", "meaning_vi": "thang máy", "vocab_id": 51, "level": "HSK3"},
                        {"word": "遇到", "pinyin": "yùdào", "meaning_vi": "gặp phải, bắt gặp", "vocab_id": 271, "level": "HSK3"},
                        {"word": "经常", "pinyin": "jīngcháng", "meaning_vi": "thường xuyên", "vocab_id": 129, "level": "HSK3"},
                        {"word": "聊天", "pinyin": "liáotiān", "meaning_vi": "trò chuyện, tán gẫu", "vocab_id": 151, "level": "HSK3"},
                        {"word": "上班", "pinyin": "shàngbān", "meaning_vi": "đi làm", "vocab_id": 90, "level": "HSK2"},
                        {"word": "可能", "pinyin": "kěnéng", "meaning_vi": "có thể, có lẽ", "vocab_id": 56, "level": "HSK2"}
                    ]

        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✓ Successfully enriched {fpath.name}")

if __name__ == "__main__":
    enrich_all()
