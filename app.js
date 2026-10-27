(function(){
  "use strict";
  var clock=document.getElementById("clock");
  function updateClock(){
    try { clock.textContent=new Intl.DateTimeFormat("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date()); }
    catch(e){ clock.textContent=""; }
  }
  updateClock(); setInterval(updateClock,30000);

  var backdrop=document.getElementById("modalBackdrop");
  var title=document.getElementById("modalTitle");
  var text=document.getElementById("modalText");
  var kicker=document.getElementById("modalKicker");
  var extra=document.getElementById("modalExtra");
  var toast=document.getElementById("toast");
  var toastTimer;
  var messages={
    discover:["KHÁM PHÁ","Chào mừng đến với HĐV TV","Đây là bản giao diện thử nghiệm. Các mục hiện đã hoạt động ở mức giao diện; tích hợp mở ứng dụng, HDMI và chức năng hệ thống cần được kiểm tra theo API mà model TV hỗ trợ."],
    apps:["ỨNG DỤNG","Khu vực ứng dụng","Ở bản tiếp theo, chúng ta có thể bổ sung danh sách ứng dụng Tizen đã được cài đặt nếu quyền và API của TV cho phép. Bản hiện tại chưa tự quét hoặc khởi chạy ứng dụng khác."],
    media:["MEDIA","Không gian giải trí","Khu vực này sẵn sàng để tích hợp nội dung video hoặc dịch vụ phát trực tuyến. Bản thử nghiệm chưa phát nội dung và không chứa dịch vụ phim."],
    search:["TÌM KIẾM","Tìm nội dung","Có thể bổ sung tìm kiếm nội bộ hoặc kết nối API nội dung ở phiên bản sau. Hiện tại đây là giao diện minh họa, chưa gửi dữ liệu ra bên ngoài."],
    settings:["CÀI ĐẶT","Cài đặt giao diện","Phiên bản tiếp theo có thể thêm lựa chọn độ tương phản, cỡ chữ và hiệu ứng. Các cài đặt hệ thống của Samsung vẫn do Tizen quản lý."]
  };
  function openModal(key){
    var item=messages[key]||messages.discover;
    kicker.textContent=item[0]; title.textContent=item[1]; text.textContent=item[2];
    extra.innerHTML="";
    backdrop.hidden=false;
    var close=document.getElementById("modalClose");
    if(close) close.focus();
  }
  function closeModal(){backdrop.hidden=true;var first=document.querySelector(".app-card");if(first)first.focus();}
  document.querySelectorAll("[data-action]").forEach(function(btn){
    btn.addEventListener("click",function(){openModal(btn.getAttribute("data-action"));});
  });
  document.getElementById("modalClose").addEventListener("click",closeModal);
  document.getElementById("modalOk").addEventListener("click",closeModal);
  backdrop.addEventListener("click",function(e){if(e.target===backdrop)closeModal();});

  // Remote-friendly directional navigation for Samsung TV browser/app environments.
  function visibleButtons(){
    return Array.prototype.slice.call(document.querySelectorAll("button.focusable")).filter(function(el){
      return !el.disabled && el.offsetParent!==null && !backdrop.hidden ? (backdrop.contains(el)) : (!backdrop.hidden ? false : !backdrop.contains(el));
    });
  }
  function moveFocus(key){
    var list=visibleButtons(); if(!list.length)return;
    var active=document.activeElement;
    var current=list.indexOf(active);
    if(current<0){list[0].focus();return;}
    var rect=active.getBoundingClientRect(), best=null, bestScore=Infinity;
    list.forEach(function(el,i){
      if(i===current)return;
      var r=el.getBoundingClientRect(),dx=(r.left+r.width/2)-(rect.left+rect.width/2),dy=(r.top+r.height/2)-(rect.top+rect.height/2);
      var valid=(key==="ArrowLeft"&&dx< -5&&Math.abs(dx)>Math.abs(dy)*.65)||(key==="ArrowRight"&&dx>5&&Math.abs(dx)>Math.abs(dy)*.65)||(key==="ArrowUp"&&dy< -5&&Math.abs(dy)>Math.abs(dx)*.65)||(key==="ArrowDown"&&dy>5&&Math.abs(dy)>Math.abs(dx)*.65);
      if(valid){var score=Math.sqrt(dx*dx+dy*dy)+Math.abs(key==="ArrowLeft"||key==="ArrowRight"?dy:dx)*1.6;if(score<bestScore){bestScore=score;best=el;}}
    });
    if(best)best.focus();
  }
  document.addEventListener("keydown",function(e){
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].indexOf(e.key)>=0){
      e.preventDefault();moveFocus(e.key);
    }else if(e.key==="Enter"){
      if(document.activeElement&&document.activeElement.tagName==="BUTTON")document.activeElement.click();
    }else if(e.key==="Escape"||e.key==="Backspace"){
      if(!backdrop.hidden){e.preventDefault();closeModal();}
    }
  });
  window.addEventListener("load",function(){var first=document.querySelector(".primary");if(first)first.focus();});
})();