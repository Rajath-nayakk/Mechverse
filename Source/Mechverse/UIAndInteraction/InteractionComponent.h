#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "VehicleFramework/ComponentBase.h"
#include "InteractionComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnComponentHoverChanged, UComponentBase*, HoveredComponent);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnComponentSelected, UComponentBase*, SelectedComponent);

UCLASS(ClassGroup=(Mechverse), meta=(BlueprintSpawnableComponent))
class MECHVERSE_API UInteractionComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UInteractionComponent();

	UPROPERTY(BlueprintAssignable, Category = "Interaction|Events")
	FOnComponentHoverChanged OnComponentHoverChanged;

	UPROPERTY(BlueprintAssignable, Category = "Interaction|Events")
	FOnComponentSelected OnComponentSelected;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Interaction|State")
	TWeakObjectPtr<UComponentBase> CurrentlyHoveredComponent;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Interaction|State")
	TWeakObjectPtr<UComponentBase> CurrentlySelectedComponent;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Interaction|Config")
	float MaxInteractionDistanceCm;

	UFUNCTION(BlueprintCallable, Category = "Interaction|Actions")
	void PerformRaycastInteraction(const FVector& CameraLocation, const FVector& CameraForwardVector);

	UFUNCTION(BlueprintCallable, Category = "Interaction|Actions")
	void SelectCurrentHovered();

	UFUNCTION(BlueprintCallable, Category = "Interaction|Actions")
	void ClearSelection();
};
