

// var totalPages = Math.ceil(totalCount / size)
//   query.skip = size * (pageNo - 1) page # start from 1
//  query.limit = size
const rankLevel = [
  'No Evaluated',
  '1st Most Informative',
  '2nd Most Informative',
  '3rd Most Informative',
  'Less Informative',
];
$D = {
  // for pagination
  recordCount: 0,
  recordPerPage: 10,
  totalPage: 0,
  currentPage: 1,
  // for collection
  collectionData: null,
  collectionTree: null,
  currentSlideData: null,
  isRankEnable: false,
  slidesRank: null,

};
$UI = {
  // collection UI
  colMessage: $('#coll-message'),
  colTree: $('#main-tree-view'),
  // slide grid
  slideMessage: $('#main-view-message'),
  slideBreadcrumb: $('#main-view-breadcrumb'),
  selRecordPerPage: $('#selRecordPerPage'),
  slideSearch: $('#slideSearch'),
  //
  mainView: $('#main-view-panel'),
  recordMessage: $('#recordMessage'),
  gridView: $('.row.grid-view'),
  gridViewContainer: $('.inner-grid-view'),
  paginator: null,
  selectedNode: null,
};

const store = new Store('../../data/');

$UI.slideSearch.on('keyup', Debounce(()=>{
  const name = ($UI.slideSearch.val()).trim();
  if (!name) {
    console.log('normal');
    return;
  }
  console.log('search');

  const Promises = [];
  Promises.push(store.countSlide());
  Promises.push(store.findSlide());


  // Promise.all(Promises);


  // Promise.all(Promises)
  //     .then(function(resps) {
  //       console.log(resps);
  //     });
}, 500));
// const query={
//   collections: '60dc90103fc2ac00332541fb',
//   _search_: {'name': 'test'},
//   sort: {'name': 1},
//   limit: 10,
//   skip: 0,
// };

// store.findSlide(null, null, null, null, query).then((data)=>{
//   console.log('slides', data);
// });
// store.countSlide({collections: '60dc90103fc2ac00332541fb', _search_: {'name': 'test'}}).then((data)=>{
//   console.log('count', data);
// });


$UI.selRecordPerPage.on('change', async ()=>{
  const newPrePage = +$UI.selRecordPerPage.val();
  const newTotalPage = Math.ceil($D.recordCount/newPrePage);
  const newCurrentPage = Math.ceil(($D.recordPerPage * ($D.currentPage - 1) + 1) / newPrePage);

  $D.recordPerPage = newPrePage;
  $D.currentPage = Math.min(newCurrentPage, newTotalPage);
  $D.totalPage = newTotalPage;

  $UI.paginator = new Paginator({
    id: 'paginator',
    currentPage: $D.currentPage,
    totalPage: $D.totalPage,
    sizing: 'pagination-sm',
    justifyContent: 'justify-content-end',
    onChange: onPaginationChange,
  });
  $UI.recordMessage.text(`Showing ${$D.recordPerPage * ($D.currentPage-1) + 1} to ${Math.min($D.recordPerPage * $D.currentPage, $D.recordCount)} of ${$D.recordCount} entities`);

  // load slide data
  const query={
    collections: $D.selectedNode.id,
    sort: {'name': 1},
    limit: $D.recordPerPage,
    skip: $D.recordPerPage * ($D.currentPage - 1),
  };

  const slides = await store.findSlide(null, null, null, null, query);
  if (Array.isArray(slides)&& slides.length > 0) {
    $D.currentSlideData = slides;

    createGridCards();
  } else {
    $D.currentSlideData = null;
  }
  // $UI.paginator.setting.currentPage = $D.currentPage;
  // $UI.paginator.setting.totalPage = $D.totalPage;
  // $UI.paginator.draw();
  // // $D.recordPerPage = newPrePage;
  // console.log(currentPage, recordPerPage);
});
// loading the collections
// store.getAllCollection().then((data) => {
//   if (Array.isArray(data)) {
//     $collectionList = data.map((d)=>{
//       d.id = d._id.$oid;
//       delete d._id;
//       return d;
//     });
//     $collectionTree = listToTree(data);


//   } else {
//     // error message

//   }
// });

async function loadSlideInfo(node) {
  if (!node.original.slides || node.original.slides.length == 0) {
    $UI.slideMessage.html(`The Collection <label class='text-primary' style='font-weight:bold;'>${node.original.name}</label> Doesn't Have Slides.`);
    $UI.mainView.hide();
    $UI.slideMessage.show();
    return;
  }

  $UI.slideMessage.hide();
  $UI.mainView.show();
  resize();

  // create loading ...
  $UI.gridViewContainer.empty();
  const loader = document.createElement('div');
  loader.classList.add('loader');
  $UI.gridViewContainer.append(loader);

  // calculate and draw the pagination
  $D.recordCount = node.original.slides.length;
  $D.recordPerPage = +$UI.selRecordPerPage.val();
  $D.totalPage = Math.ceil($D.recordCount/$D.recordPerPage);
  $D.currentPage = 1;
  $UI.paginator = new Paginator({
    id: 'paginator',
    currentPage: $D.currentPage,
    totalPage: $D.totalPage,
    sizing: 'pagination-sm',
    justifyContent: 'justify-content-end',
    onChange: onPaginationChange,
  });
  $UI.recordMessage.text(`Showing ${$D.recordPerPage * ($D.currentPage-1) + 1} to ${Math.min($D.recordPerPage * $D.currentPage, $D.recordCount)} of ${$D.recordCount} entities`);

  // load slide data
  const query={
    collections: node.id,
    sort: {'name': 1},
    limit: $D.recordPerPage,
    skip: $D.recordPerPage * ($D.currentPage - 1),
  };

  const slides = await store.findSlide(null, null, null, null, query);
  if (Array.isArray(slides)&& slides.length > 0) {
    $D.currentSlideData = slides;


    createGridCards();
  } else {
    $D.currentSlideData = null;
  }
}
async function getSlideRankStatus() {
  const sids = $D.selectedNode.original&&
  $D.selectedNode.original.slides&&
  Array.isArray($D.selectedNode.original.slides)?
  $D.selectedNode.original.slides:[];
  if (sids.length == 0) return false;
  var sinfo = await store.getSlidesHumanMarkNum(sids);
  sinfo = sinfo.map((d)=>d._id);

  for (let index = 0; index < sids.length; index++) {
    const sid = sids[index];
    // check evalutions
    const evalData = $D.SlidesEvaluations.find((e)=>e.sid==sid);
    if (evalData&&evalData.eval&&evalData.eval.some((e)=>e.creator == getUserId())&&sinfo.includes(sid)) {
    } else {
      return false;
    }
    // check anntations

    //
    //
  }
  return true;
}

async function onPaginationChange({currentPage, totalPage}) {
  $D.currentPage = currentPage;
  // create loading ...
  $UI.gridViewContainer.empty();
  const loader = document.createElement('div');
  loader.classList.add('loader');
  $UI.gridViewContainer.append(loader);


  $D.currentPage = currentPage;
  const query={
    collections: $D.selectedNode.id,
    sort: {'name': 1},
    limit: $D.recordPerPage,
    skip: $D.recordPerPage * ($D.currentPage - 1),
  };
  $UI.recordMessage.text(`Showing ${$D.recordPerPage * ($D.currentPage-1) + 1} to ${Math.min($D.recordPerPage * $D.currentPage, $D.recordCount)} of ${$D.recordCount} entities`);

  const slides = await store.findSlide(null, null, null, null, query);


  if (Array.isArray(slides)&& slides.length > 0) {
    $D.currentSlideData = slides;

    createGridCards();
  } else {
    $D.currentSlideData = null;
  }
}
async function createGridCards() {
  $UI.gridViewContainer.empty();
  $D.currentSlideData.forEach((slide) => {
    $UI.gridViewContainer.append(createGridCard(slide));
  });
}

function createGridCard(d) {
  const sid = d['_id']['$oid'];
  const card = document.createElement('div');
  card.id = sid;
  card.classList.add('grid-card');
  const cardContent = document.createElement('div');
  cardContent.id = sid;
  cardContent.classList.add('grid-card-content');
  // add to the link
  cardContent.addEventListener('click', ()=>{
    location.href=`../viewer/viewer.html?slideId=${sid}`;
  });
  card.appendChild(cardContent);


  const loader = document.createElement('div');
  loader.classList.add('loader');
  cardContent.append(loader);
  // create Image
  const img = document.createElement('img');
  img.alt = `${d.name}`;

  if (d.height > d.width) {
    // HEI
    img.src = `../../img/IIP/raw/?FIF=${d.location}&HEI=256&CVT=.jpg`;
  } else {
    // WID
    img.src = `../../img/IIP/raw/?FIF=${d.location}&WID=256&CVT=.jpg`;
  }

  img.onload = ()=>{
    loader.remove();
    cardContent.append(img);
  };


  // add title
  const title = document.createElement('div');
  title.classList.add('grid-card-title');
  title.classList.add('bg-dark');
  title.title = `${d.name}`;
  title.textContent = `${d.name}`;
  cardContent.appendChild(title);

  // DOE customized
  // informativeness indicator
  const [indicator, score] = getInformativenessInfos(sid);
  card.appendChild(indicator);
  if (score) card.appendChild(score);
  //

  //
  const indicatorIcon = indicator.querySelector('i');
  if ($D.isRankEnable && indicatorIcon && indicatorIcon.classList.contains('fa-check') ) {
    const rankDropDown = generateDropdownMenu(card, d);
    card.appendChild(rankDropDown);
  }
  // anchor


  // anchor.appendChild(card);

  return card;
}

function generateDropdownMenu(elt, data) {
  const div = document.createElement('div');
  div.classList.add('rank-dropdown');
  div.classList.add('dropdown');
  const level = getRankLevel(elt.id);

  const dropdown = `
  <button class="btn btn-sm ${level?'btn-primary':'btn-danger'} dropdown-toggle" type="button" id="dropdown_${elt.id}" data-bs-toggle="dropdown" aria-expanded="false">${rankLevel[level]}</button>
  <ul class="dropdown-menu" aria-labelledby="dropdown_${elt.id}">
    <li data-sid="${elt.id}" data-level="1"><a class="dropdown-item ${level==1?'active':''}" href="#">1st Most Informative</a></li>
    <li data-sid="${elt.id}" data-level="2"><a class="dropdown-item ${level==2?'active':''}" href="#">2nd Most Informative</a></li>
    <li data-sid="${elt.id}" data-level="3"><a class="dropdown-item ${level==3?'active':''}" href="#">3rd Most Informative</a></li>
    <li data-sid="${elt.id}" data-level="less"><a class="dropdown-item ${level==4?'active':''}" href="#">Less Informative</a></li>
  </ul>`;
  div.innerHTML = dropdown;
  $(div).find('li').on('click', async function(e) {
    const {sid, level} = this.dataset;
    // TODO update DB
    const data = await store.rankSlidesInformativeness($D.selectedNode.id, getUserId(), sid, level); // $D.selectedNode.id;
    if (data&&data.result&&data.result.ok&&data.result.n) { // correct
      const slidesRank = await store.findSlidesInformativeness($D.selectedNode.id, getUserId());
      if (slidesRank&&Array.isArray(slidesRank)) {
        $D.slidesRank = slidesRank.length==0?null:slidesRank[0];
        // sync ui
        syncSlideRankDropdown(sid, level);
      } else { // error TODO

      }
    } else { // error

    }
  });
  return div;
}

function syncSlideRankDropdown() {
  $('.grid-view .inner-grid-view .grid-card').each(function(i) {
    const level = getRankLevel(this.id);
    $(this).find('li > a').removeClass('active');
    $(this).find('.dropdown-toggle').text(rankLevel[level]);
    $(this).find('.dropdown-toggle').addClass('btn-primary');
    $(this).find('.dropdown-toggle').removeClass('btn-danger');
    switch (level) {
      case 1:
        $(this).find('li[data-level=1] > a').addClass('active');
        break;
      case 2:
        $(this).find('li[data-level=2] > a').addClass('active');
        break;
      case 3:
        $(this).find('li[data-level=3] > a').addClass('active');
        break;
      case 4:
        $(this).find('li[data-level=less] > a').addClass('active');
        break;
      default:
        $(this).find('.dropdown-toggle').removeClass('btn-primary');
        $(this).find('.dropdown-toggle').addClass('btn-danger');
    }
  });
}

function getRankLevel(sid) {
  if (!$D.slidesRank) return 0;
  if ($D.slidesRank.first==sid) return 1;
  if ($D.slidesRank.second==sid) return 2;
  if ($D.slidesRank.third==sid) return 3;
  if ($D.slidesRank.less.includes(sid)) return 4; // less
  return 0;
}
function getInformativenessInfos(sid) {
  var informativenessScore = null;
  const informativenessIndicator = document.createElement('div');
  informativenessIndicator.classList.add('indicator');
  const icon = document.createElement('i');
  icon.classList.add('fas');
  for (let index = 0; index < $D.SlidesEvaluations.length; index++) {
    const slideEvals = $D.SlidesEvaluations[index];
    if (slideEvals.sid == sid && slideEvals.eval&&Array.isArray(slideEvals.eval)) {
      const evaluations = slideEvals.eval;
      for (let idx = 0; idx < evaluations.length; idx++) {
        const eval = evaluations[idx];
        if (eval.creator == getUserId()&&eval.evaluation&&eval.evaluation.informativeness) {
          if (eval.evaluation.informativeness == '1') {
            icon.classList.add('fa-check');
            icon.classList.add('text-success');
            icon.title = 'Informative';
            // create score div
            informativenessScore = document.createElement('div');
            informativenessScore.classList.add('score');// badge bg-success
            informativenessScore.classList.add('badge');
            informativenessScore.classList.add('rounded-pill');
            informativenessScore.classList.add('bg-success');
            informativenessScore.textContent = `SCORE: ${eval.evaluation.absolute_informativeness}`;
          } else {
            icon.classList.add('fa-times');
            icon.classList.add('text-danger');
            icon.title = 'Uninformative';
          }
          informativenessIndicator.appendChild(icon);
          return [informativenessIndicator, informativenessScore];
        }
      }
    }
  }
  //
  icon.classList.add('fa-question');
  icon.classList.add('text-muted');
  icon.title = 'Not Evaluated';
  informativenessIndicator.appendChild(icon);
  return [informativenessIndicator, informativenessScore];
}
function createCollectionTree() {
  $UI.colTree.jstree({
    'core': {
      'data': $D.collectionTree,
      'multiple': false,
      'check_callback': true,
    },
    'types': {
      '#': {'max_children': 1, 'max_depth': 4, 'valid_children': ['default']},
      'default': {'valid_children': ['default']},
    },
    'plugins': ['search', 'wholerow'],
  });


  $UI.colTree.on('loaded.jstree', () => {
    //
    if ($D.collectionData&&$D.collectionData.length) return;
    // show up message
    $UI.colMessage.show();
  });

  // bind select node event
  $UI.colTree.on('select_node.jstree', async function(event, _data) {
    const node = _data.node;
    if (node&&$D.selectedNode!==node) {
      $D.selectedNode = node;
      // UI control

      // create collection path
      createBreadcrumb(node);
      if (node.children.length > 0) {
        $UI.slideMessage.text('Please Select A Collection Without Subcollection ...');
        $UI.mainView.hide();
        $UI.slideMessage.show();
        return;
      }

      // the collection has slides
      if (node.original.slides&&node.original.slides.length>0) {

      } else {

      }
      // set the rank slide status
      $D.isRankEnable = await getSlideRankStatus();
      // get the rank data
      if ($D.isRankEnable) {
        const slidesRank = await store.findSlidesInformativeness(node.id, getUserId());
        if (slidesRank&&Array.isArray(slidesRank)) {
          $D.slidesRank = slidesRank.length==0?null:slidesRank[0];
        } else { // error TODO

        }
      }
      // loading slide data
      // $D.s = await
      loadSlideInfo(node);

      // let slides checked if the slides in the collection
      // const collData = $D.collectionData.find((d)=>d.id==node.id);
      // deselected all slides

      // $DTable.clear();
      // $DTable.rows.add($slideData).search('').draw(true);
    }
  });
}

window.addEventListener('resize', resize);
// console.log(calculateSize(document.querySelector('.pagination-control')));
window.addEventListener('load', async ()=> {
  var edata = await store.getSlidesEvaluations(getUserId());
  $D.SlidesEvaluations = edata;
  if (Array.isArray(edata)) {
    $D.slideEvalNums = edata.filter((d)=>d.eval).map((d)=>d._id);
  } else { // error
    $D.slideEvalNums = [];
  }
  // get the collection data
  var data = await store.getAllCollection();
  if (Array.isArray(data)) {
    $D.collectionData = data.map((d)=>{
      d.id = d._id.$oid;
      d.name = d.text;
      delete d._id;
      return d;
    });
    $D.collectionTree = listToTree($D.collectionData);
    $D.collectionData.forEach((d)=>{
      if (d.children && d.children.length == 0) d.text = `${d.text} [${d.slides?d.slides.length:0}]`;
      if (d.slides) {
        d.icon = setCollectionIcon(d);
      } else {
        d.icon = './folder.png';
      }
    });
    createCollectionTree();
  } else { // error message
    $UI.colTree.hide();
    // showup the error message
    $UI.colMessage.removeClass('alert-warning');
    $UI.colMessage.addClass('alert-danger');
    $UI.colMessage.text(`Can't Load the Collection Data!`);
    $UI.colMessage.show();
    return;
  }
});

function resize() {
  // don't calculate if the main view is hidden
  if ($UI.mainView.css('display') == 'none') return;

  const {innerWidth, innerHeight} = window;
  const gridView = document.querySelector('.grid-view');
  const pagCtrl = document.querySelector('.pagination-control');
  const footer = document.querySelector('footer');
  const breadcrumb = document.querySelector('#main-view-breadcrumb');
  if (innerWidth <= 768 ) {
    gridView.style.height = null;
    return;
  }


  const {x, y} = gridView.getBoundingClientRect();
  const pageCtrlRect = calculateSize(pagCtrl);
  const footerRect = calculateSize(footer);
  gridView.style.height = `${Math.ceil(innerHeight - y - pageCtrlRect.height - footerRect.height )}px`;
}

function calculateSize(elt) {
  const {marginLeft, marginRight, marginTop, marginBottom} = getComputedStyle(elt);


  const width = Math.ceil(elt.offsetWidth) + parseInt(marginLeft) + parseInt(marginRight);
  const height = Math.ceil(elt.offsetHeight) + parseInt(marginTop) + parseInt(marginBottom);
  // console.log(elt.offsetWidth, elt.offsetHeight);
  // console.log(width, height);
  return {width, height, offsetWidth: Math.ceil(elt.offsetWidth), offsetHeight: Math.ceil(elt.offsetHeight)};
}


function createBreadcrumb(node) {
  // clear the old crumb
  $UI.slideBreadcrumb.empty();
  if (!node) return;
  //
  const parentNames = getParentNames(node);

  const crumbList = [...parentNames.reverse(), node.original.name];

  $UI.slideBreadcrumb.html(crumbList.map((name)=>
    name==node.original.name?`<div class="breadcrumb-item active" aria-current="page">${name}</div>`:`<div class="breadcrumb-item" ><a href="#">${name}</a></div>`,
  ).join(''));
}

function getParentNames(node) {
  const rs = [];
  node.parents.forEach((id) => {
    if (id!=='#') {
      const cdata = $D.collectionData.find((d)=>d.id == id);
      rs.push(cdata.name);
    }
  });
  return rs;
}

function setCollectionIcon(node) {
  for (let index = 0; index < node.slides.length; index++) {
    const sid = node.slides[index];
    if (!$D.slideEvalNums.includes(sid)) return './folder.png';
  }
  return './check-folder.png';
}