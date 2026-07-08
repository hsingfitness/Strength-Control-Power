
/* ===================================
   Strength Control Power
   Contact Form JavaScript
=================================== */


document.addEventListener(
    "DOMContentLoaded",
    function () {


        const contactForm =
            document.querySelector(
                "#contact-form"
            );



        if (!contactForm) {

            return;

        }




        contactForm.addEventListener(
            "submit",
            function(event){



                const name =
                    document
                    .getElementById(
                        "name"
                    );



                const email =
                    document
                    .getElementById(
                        "email"
                    );



                const message =
                    document
                    .getElementById(
                        "message"
                    );





                // Check empty fields


                if (
                    name.value.trim() === "" ||
                    email.value.trim() === "" ||
                    message.value.trim() === ""
                ) {


                    event.preventDefault();


                    showMessage(
                        "Please complete all required fields.",
                        "error"
                    );


                    return;


                }





                // Email validation


                const emailPattern =
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;



                if (
                    !emailPattern.test(
                        email.value
                    )
                ) {


                    event.preventDefault();


                    showMessage(
                        "Please enter a valid email address.",
                        "error"
                    );


                    return;


                }





                /*
                    Future integration:

                    Formspree:
                    - keep normal submit

                    EmailJS:
                    - replace this section
                    - send email using API

                    Backend:
                    - send data to Python/Node server

                */


                showMessage(
                    "Sending message...",
                    "success"
                );


            }
        );






        function showMessage(
            text,
            type
        ){


            let messageBox =
                document
                .querySelector(
                    ".form-message"
                );



            if(!messageBox){


                messageBox =
                document.createElement(
                    "div"
                );


                messageBox.className =
                "form-message";


                contactForm
                .appendChild(
                    messageBox
                );


            }




            messageBox.innerHTML =
            text;



            messageBox.className =
            "form-message " + type;



        }




    }
);
