/* ===================================
   Strength Control Power
   Animation JavaScript
=================================== */


document.addEventListener(
    "DOMContentLoaded",
    function () {



    /* --------------------------------
       Scroll Reveal Animation
    -------------------------------- */


    const revealElements =
        document.querySelectorAll(
            ".reveal"
        );



    const revealObserver =
        new IntersectionObserver(
            function(entries){


                entries.forEach(
                    function(entry){


                        if(
                            entry.isIntersecting
                        ){

                            entry.target
                            .classList
                            .add(
                                "active"
                            );


                            revealObserver
                            .unobserve(
                                entry.target
                            );

                        }


                    }
                );


            },
            {
                threshold:0.15
            }
        );



    revealElements.forEach(
        function(element){

            revealObserver.observe(
                element
            );

        }
    );







    /* --------------------------------
       Counter Animation
    -------------------------------- */


    const counters =
        document.querySelectorAll(
            ".counter"
        );



    counters.forEach(
        function(counter){


            counter.innerHTML = "0";

            const target =
                Number(
                    counter
                    .dataset
                    .target
                );



            let current = 0;


            const speed = 50;



            function updateCounter(){


                const increment =
                    target / speed;



                if(
                    current < target
                ){

                    current += increment;


                    counter.innerHTML =
                    Math.ceil(
                        current
                    );


                    setTimeout(
                        updateCounter,
                        30
                    );


                }
                else {


                    counter.innerHTML =
                    target;


                }


            }



            updateCounter();



        }
    );







    /* --------------------------------
       Image Fade Loading
    -------------------------------- */


    const images =
        document.querySelectorAll(
            "img"
        );



    images.forEach(
        function(image){


            image.addEventListener(
                "load",
                function(){


                    image.classList
                    .add(
                        "loaded"
                    );


                }
            );


        }
    );







    /* --------------------------------
       Card Hover Effect
    -------------------------------- */


    const cards =
        document.querySelectorAll(
            "article"
        );



    cards.forEach(
        function(card){



            card.addEventListener(
                "mouseenter",
                function(){

                    card.classList
                    .add(
                        "hover"
                    );

                }
            );



            card.addEventListener(
                "mouseleave",
                function(){

                    card.classList
                    .remove(
                        "hover"
                    );

                }
            );



        }
    );



});
